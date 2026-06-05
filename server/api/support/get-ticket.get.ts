export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const TOKEN = config.directusSupportUserToken as string;
    const ticketId = getQuery(event).id as string | undefined;

    if (!ticketId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing ticket ID.' });
    }

    if (!TOKEN) {
        throw createError({ statusCode: 500, statusMessage: 'DIRECTUS_SUPPORT_USER_TOKEN is not defined.' });
    }

    const cookies = parseCookies(event);
    const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
    const sessionToken = cookies[config.sessionTokenName as string] || null;
    const userToken = bearerToken ?? sessionToken;

    if (!userToken) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });
    }

    let currentUserId: string;
    try {
        const me = await directusServer.request(withToken(userToken, readMe({ fields: ['id'] }))) as { id: string };
        currentUserId = me.id;
    } catch {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });
    }

    let ticket: any;
    try {
        ticket = await directusServer.request(
            withToken(TOKEN, readItem('support_cases' as any, ticketId, {
                fields: [
                    'id',
                    'date_created',
                    'status',
                    'category',
                    'summary',
                    'customer_first_name',
                    'customer_last_name',
                    'customer_email',
                    'customer',
                    'folder',
                    {
                        messages: [
                            'id',
                            'date_created',
                            'sender_role',
                            'sender_email',
                            'message',
                            'is_internal',
                            {
                                files: [
                                    'id',
                                    { file: ['id', 'filename_download', 'filesize'] },
                                ],
                            },
                        ],
                    },
                ],
                filter: {
                    customer: { _eq: currentUserId },
                    folder: { name: { _eq: ticketId } },
                },
                deep: {
                    messages: {
                        sort: '-date_created',
                        _filter: { is_internal: { _neq: true } },
                    },
                } as any,
            }))
        );
    } catch (e) {
        console.error('Failed to fetch ticket:', e);
        throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' });
    }

    const customerId = typeof ticket.customer === 'object' ? ticket.customer?.id : ticket.customer;
    if (customerId !== currentUserId) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden.' });
    }

    return ticket;
});
