import type { H3Event } from 'h3';

/**
 * Accepts a customer-uploaded proof of payment (receipt/bank transfer
 * confirmation) for a manual/offline-payment order and links it into
 * congress_orders.payment_proof.
 *
 * Ownership is proven one of three ways:
 *  - A congress_orders row the logged-in session owns (verifyOrderOwnership).
 *  - A verified guest email session (also verifyOrderOwnership).
 *  - The checkout-time guest token (congress_orders.token), read from the
 *    multipart body's `guestToken` field — same value order-by-token.get.ts
 *    checks, but here sent in a POST body rather than a URL, since a guest
 *    landing on confirmation.vue right after checkout has neither a session
 *    nor an email session yet.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const TOKEN = config.directusOrderBotToken as string;
	const orderId = getRouterParam(event, 'id');

	if (!orderId) {
		throw createError({ statusCode: 400, statusMessage: 'orderId is required' });
	}

	const formData = await readMultipartFormData(event);
	if (!formData) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid form submission' });
	}

	const filePart = formData.find((part) => part.name === 'file' && part.filename);
	const guestToken = formData.find((part) => part.name === 'guestToken')?.data.toString() || null;

	if (!filePart) {
		throw createError({ statusCode: 400, statusMessage: 'A file is required' });
	}

	// Both enforced again here since the client-side checks (PaymentProofUpload.vue)
	// are trivially bypassable by anyone calling this endpoint directly.
	const MAX_BYTES = 5 * 1024 * 1024;
	if (filePart.data.length > MAX_BYTES) {
		throw createError({ statusCode: 400, statusMessage: 'File must be 5MB or smaller.' });
	}

	const ALLOWED_TYPE_PREFIXES = ['image/', 'application/pdf', 'text/plain'];
	if (!filePart.type || !ALLOWED_TYPE_PREFIXES.some((prefix) => filePart.type!.startsWith(prefix))) {
		throw createError({ statusCode: 400, statusMessage: 'File must be an image, PDF, or text file.' });
	}

	let verified = await verifyOrderOwnership(event, orderId);

	if (!verified && guestToken) {
		try {
			// `congress_orders` doesn't exist in the generated schema yet — cast
			// until it's created in Directus and `npm run generate:types` picks it up.
			const congressOrder = await directusServer.request<{ token: string | null }>(
				withToken(TOKEN, readItem('congress_orders' as any, orderId, { fields: ['token'] })),
			);
			verified = !!congressOrder.token && congressOrder.token === guestToken;
		} catch {
			verified = false;
		}
	}

	if (!verified) {
		throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
	}

	const blob = new Blob([filePart.data], { type: filePart.type });
	const uploadFormData = new FormData();
	uploadFormData.append('file', blob, filePart.filename);

	let uploadedFile: { id?: string } | undefined;
	try {
		uploadedFile = await directusServer.request<{ id: string }>(withToken(TOKEN, uploadFiles(uploadFormData)));
	} catch (error: any) {
		// See server/api/abstracts/upload-figure.post.ts — ofetch throws its own
		// FetchError on non-2xx with the real Directus validation detail nested
		// under error.data, which was previously going unlogged/unhandled.
		console.error('[payment-proof] Directus upload failed:', JSON.stringify(error?.data ?? error));
		throw createError({ statusCode: 502, statusMessage: 'Could not upload the file. Please try again.' });
	}

	if (!uploadedFile?.id) {
		console.error('[payment-proof] Directus upload returned no file id:', uploadedFile);
		throw createError({ statusCode: 502, statusMessage: 'Could not upload the file. Please try again.' });
	}

	await directusServer.request(withToken(TOKEN, updateItem('congress_orders' as any, orderId, { payment_proof: uploadedFile.id })));

	return await directusServer.request<{ id: string; filename_download: string; uploaded_on: string }>(
		withToken(TOKEN, readFile(uploadedFile.id, { fields: ['id', 'filename_download', 'uploaded_on'] })),
	);
});
