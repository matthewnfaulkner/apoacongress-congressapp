import type { H3Event } from 'h3';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

/**
 * Uploads one supporting-evidence file (see congress_charges.requires_evidence
 * on complete.vue) ahead of bundle creation — there's no order, session, or
 * even a logged-in account guaranteed to exist yet at this point in checkout,
 * so this uses the order-bot token rather than a customer session, the same
 * way payment-proof.post.ts's own upload does. The 5MB/type checks are
 * enforced here since complete.vue's own checks are client-side only.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const TOKEN = config.directusOrderBotToken as string;

	const formData = await readMultipartFormData(event);
	if (!formData) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid form submission' });
	}

	const filePart = formData.find((part) => part.name === 'file' && part.filename);
	if (!filePart) {
		throw createError({ statusCode: 400, statusMessage: 'A file is required' });
	}

	const MAX_BYTES = 5 * 1024 * 1024;
	if (filePart.data.length > MAX_BYTES) {
		throw createError({ statusCode: 400, statusMessage: 'File must be 5MB or smaller.' });
	}

	if (!filePart.type || !ALLOWED_TYPES.includes(filePart.type)) {
		throw createError({ statusCode: 400, statusMessage: 'File must be a PDF, JPEG, or PNG.' });
	}

	const blob = new Blob([filePart.data], { type: filePart.type });
	const uploadFormData = new FormData();
	uploadFormData.append('folder', config.public.orderEvidenceFolder as string);
	uploadFormData.append('file', blob, filePart.filename);

	let uploadedFile: { id?: string } | undefined;
	try {
		uploadedFile = await directusServer.request<{ id: string }>(withToken(TOKEN, uploadFiles(uploadFormData)));
	} catch (error: any) {
		console.error('[evidence-upload] Directus upload failed:', JSON.stringify(error?.data ?? error));
		throw createError({ statusCode: 502, statusMessage: 'Could not upload the file. Please try again.' });
	}

	if (!uploadedFile?.id) {
		console.error('[evidence-upload] Directus upload returned no file id:', uploadedFile);
		throw createError({ statusCode: 502, statusMessage: 'Could not upload the file. Please try again.' });
	}

	return { id: uploadedFile.id };
});
