import type { Organisation } from '#shared/types/schema';

export default defineEventHandler(async (event) => {
    const { id } = getQuery(event);
    const config = useRuntimeConfig();

    if (!id) {
        throw createError({ statusCode: 400, statusMessage: 'Organisation ID required' });
    }

    const results = await directusServer.request(
        readItems('congress_organisations' as any, {
            filter: {
                congress: { site: { _eq: config.public.siteId } },
                organisation: { id: { _eq: id as string } },
            } as any,
            fields: [
                'congress',
                {
                    organisation: [
                        'id',
                        'name',
                        'short_name',
                        'abbr',
                        'address',
                        'phone',
                        'email',
                        'logo',
                        'website',
                        'type',
                        'description',
                        {
                            apoa_section_details: [
                                'id',
                                {
                                    committees: [
                                        'id',
                                        {
                                            committee: [
                                                'id',
                                                'title',
                                                'slug',
                                                'congress',
                                                {
                                                    positions: [
                                                        'id',
                                                        'title',
                                                        {
                                                            members: [
                                                                'id',
                                                                {
                                                                    persons_id: [
                                                                        'id',
                                                                        'first_name',
                                                                        'last_name',
                                                                        'title',
                                                                        'qualifications',
                                                                        'image',
                                                                        'country',
                                                                        'bio',
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ] as any,
            limit: 1,
        }),
    );

    const result = results[0];
    if (!result || !result.organisation) {
        throw createError({ statusCode: 404, statusMessage: 'Organisation not found' });
    }

    const congressId = (result as any).congress?.id ?? (result as any).congress;
    const org = result.organisation as any;

    // Filter committees to only those belonging to the current congress
    if (org.apoa_section_details) {
        for (const section of org.apoa_section_details) {
            if (section.committees) {
                section.committees = section.committees.filter((c: any) => {
                    const committeeCongressId = c.committee?.congress?.id ?? c.committee?.congress;
                    return committeeCongressId === congressId;
                });
            }
        }
    }

    return org as Organisation;
});
