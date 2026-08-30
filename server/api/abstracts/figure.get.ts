// Figure files are permission-restricted in Directus (read scoped to
// uploaded_by == $CURRENT_USER, same as the upload itself — see
// upload-figure.post.ts), so a plain <img src="{directusUrl}/assets/:id">
// 401s: it's cross-origin from Directus and carries neither the session
// cookie nor a bearer header. Proxying through the caller's own session here
// (not a bot token) lets Directus's own permission do the ownership check —
// same pattern as server/api/support/file.get.ts, minus its separate
// ownership lookup, which isn't needed since the read permission already is
// the ownership check.
export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const { id: fileId } = getQuery(event) as { id?: string };

	if (!fileId) throw createError({ statusCode: 400, statusMessage: 'Missing file ID.' });

	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName as string] ?? null;

	if (!sessionToken) throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });

	const assetUrl = `${config.public.directusUrl}/assets/${fileId}`;
	const response = await fetch(assetUrl, {
		headers: { Authorization: `Bearer ${sessionToken}` },
	});

	if (!response.ok) throw createError({ statusCode: response.status, statusMessage: 'File fetch failed.' });

	const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
	setHeader(event, 'content-type', contentType);

	return sendStream(event, response.body as ReadableStream);
});
