import { createDirectus, rest, withToken, readMe, readItems } from '@directus/sdk';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const TOKEN = config.directusServerToken as string;
    const { id: fileId } = getQuery(event) as { id?: string };

    if (!fileId) throw createError({ statusCode: 400, statusMessage: 'Missing file ID.' });
    if (!TOKEN) throw createError({ statusCode: 500, statusMessage: 'Server token not configured.' });

    // Authenticate user via session cookie
    const cookie = getHeader(event, 'cookie') ?? '';
    const userDirectus = createDirectus(config.public.directusUrl as string).with(
        rest({
            onRequest: (options) => ({
                ...options,
                headers: { ...options.headers, cookie },
            }),
        })
    );

    let currentUserId: string;
    try {
        const me = await userDirectus.request(readMe({ fields: ['id'] })) as { id: string };
        currentUserId = me.id;
    } catch {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });
    }

    const serverDirectus = createDirectus(config.public.directusUrl as string).with(rest());

    // Verify this file belongs to a support case owned by the current user
    let records: any[];
    try {
        records = await serverDirectus.request(
            withToken(TOKEN, readItems('case_message_files', {
                filter: { file: { _eq: fileId } },
                fields: ['id', { message: [{ case: [{ customer: ['id'] }] }] }],
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

    // Proxy the file from Directus using the server token
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
