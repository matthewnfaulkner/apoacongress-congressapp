// Figure uploads used to go straight from the client to Directus's own
// /files endpoint (via $directus.request(uploadFiles(fd))), which meant the
// 5MB/JPEG-or-PNG checks in submission.vue were client-side only and
// trivially bypassable by anyone calling Directus directly with a valid
// session. Routing through this endpoint instead lets those checks actually
// be enforced, while still uploading under the customer's own session
// (not a bot token) — the same permission model as before.
export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName as string] ?? null;

	if (!sessionToken) {
		throw createError({ statusCode: 401, statusMessage: 'You must be logged in to upload a figure.' });
	}

	try {
		await directusServer.request(withToken(sessionToken, readMe({ fields: ['id'] })));
	} catch {
		throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session.' });
	}

	const formData = await readMultipartFormData(event);
	if (!formData) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid form submission' });
	}

	const filePart = formData.find((part) => part.name === 'file' && part.filename);
	if (!filePart) {
		throw createError({ statusCode: 400, statusMessage: 'A file is required' });
	}

	// Same checks as onFigureFileChange in submission.vue — enforced again
	// here since that client-side check is bypassable.
	const MAX_BYTES = 5 * 1024 * 1024;
	if (filePart.data.length > MAX_BYTES) {
		throw createError({ statusCode: 400, statusMessage: 'File must be 5MB or smaller.' });
	}

	const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
	if (!filePart.type || !ALLOWED_TYPES.includes(filePart.type)) {
		throw createError({ statusCode: 400, statusMessage: 'File must be a JPEG or PNG image.' });
	}

	const blob = new Blob([filePart.data], { type: filePart.type });
	const uploadFormData = new FormData();
	uploadFormData.append('storage', 's3');
	uploadFormData.append('folder', config.public.abstractFiguresFolder as string);
	uploadFormData.append('file', blob, filePart.filename);

	const uploaded = await directusServer.request<{ id: string }>(withToken(sessionToken, uploadFiles(uploadFormData)));

	return { id: uploaded.id };
});
