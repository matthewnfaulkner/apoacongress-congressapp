import type { Organisation } from '#shared/types/schema';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();

    const results = await directusServer.request(
        readItems('congress_organisations' as any, {
            filter: {
                congress: { site: { _eq: config.public.siteId } },
            } as any,
            fields: [
                'sort',
                {
                    organisation: [
                        'id',
                        'name',
                        'short_name',
                        'abbr',
                        'logo',
                        'website',
                        'type',
                        'description',
                    ],
                },
            ] as any,
            sort: ['sort'],
            limit: -1,
        }),
    );

    const organisations = results
        .map((r: any) => r.organisation)
        .filter(Boolean) as Organisation[];

    return organisations;
});
