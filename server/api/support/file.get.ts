export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const TOKEN = config.directusSupportUserToken as string;
    const { id: fileId } = getQuery(event) as { id?: string };

    if (!fileId) throw createError({ statusCode: 400, statusMessage: 'Missing file ID.' });
    if (!TOKEN) throw createError({ statusCode: 500, statusMessage: 'Server token not configured.' });

    const cookies = parseCookies(event);
    const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
    const sessionToken = cookies[config.sessionTokenName as string] || null;
    const userToken = bearerToken ?? sessionToken;

    if (!userToken) throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });

    let currentUserId: string;
    try {
        const me = await directusServer.request(withToken(userToken, readMe({ fields: ['id'] }))) as { id: string };
        currentUserId = me.id;
    } catch {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });
    }

    let records: any[];
    try {
        records = await directusServer.request(
            withToken(TOKEN, readItems('case_message_files' as any, {
                filter: { file: { _eq: fileId } },
                fields: ['id', { message: [{ case: ['customer'] }] }],
                limit: 1,
            }))
        ) as any[];
    } catch (e) {
        console.error('Ownership check failed:', e);
        throw createError({ statusCode: 500, statusMessage: 'Could not verify file ownership.' });
    }

    if (!records.length) throw createError({ statusCode: 404, statusMessage: 'File not found.' });

    const customer = records[0]?.message?.case?.customer;
    const customerId = typeof customer === 'object' ? customer?.id : customer;

    if (customerId !== currentUserId) throw createError({ statusCode: 403, statusMessage: 'Forbidden.' });

    const assetUrl = `${config.public.directusUrl}/assets/${fileId}`;
    const response = await fetch(assetUrl, {
        headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!response.ok) throw createError({ statusCode: response.status, statusMessage: 'File fetch failed.' });

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition')?.replace('attachment', 'inline') ?? 'inline';

    setHeader(event, 'content-type', contentType);
    setHeader(event, 'content-disposition', contentDisposition);

    return sendStream(event, response.body as ReadableStream);
});
