import type { Hotel } from '#shared/types/schema';

export default defineEventHandler(async (event) => {
    const { id } = getQuery(event);
    const config = useRuntimeConfig();

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Hotel ID required' });
    }

    const hotels = await directusServer.request(
        readItem('hotels' as any, id as string, {
            filter: {
                congresses: { congress: { site: { _eq: config.public.siteId } } },
            } as any,
            fields: [
                'id',
                'name',
                'star_rating',
                'website',
                'phone',
                'address',
                'image',
                'rooms',
                'location',
                'ammenities',
                {
                    congresses: [
                        'directions'
                    ]
                }

            ] as any,
        }),
    );

    if (!hotels) {
        throw createError({ statusCode: 404, statusMessage: 'Hotel not found' });
    }

    return hotels as Hotel & { congresses: Array<{ directions: string | null }> };
});
