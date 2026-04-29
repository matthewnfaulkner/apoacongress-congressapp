import { createDirectus, rest, withToken, readItem, readMe } from '@directus/sdk';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const TOKEN = config.directusServerToken as string;
    const ticketId = getQuery(event).id as string | undefined;

    if (!ticketId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing ticket ID.' });
    }

    if (!TOKEN) {
        throw createError({ statusCode: 500, statusMessage: 'DIRECTUS_SERVER_TOKEN is not defined.' });
    }

    // Verify the requesting user is authenticated
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

    let ticket: any;
    try {
        ticket = await serverDirectus.request(
            withToken(TOKEN, readItem('support_cases', ticketId, {
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
                    customer: {
                        _eq: currentUserId
                    },
                    folder: {
                        name: {
                            _eq: ticketId
                        }
                    }
                },
                deep: {
                    messages: {
                        sort: '-date_created',
                        _filter: {
                            is_internal: { _neq: true },
                        },
                    },
                },
            }))
        );
    } catch (e) {
        console.error('Failed to fetch ticket:', e);
        throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' });
    }

    // Enforce ownership — only the ticket's customer can view it
    const customerId = typeof ticket.customer === 'object' ? ticket.customer?.id : ticket.customer;
    if (customerId !== currentUserId) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden.' });
    }

    return ticket;
});
