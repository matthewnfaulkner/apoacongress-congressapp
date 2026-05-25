import type { Organisation } from '#shared/types/schema';

export default defineEventHandler(async (event) => {

    const { exclude } = getQuery(event);
    
    const config = useRuntimeConfig();

    const excludeList = exclude ? String(exclude).split(',').map(s => s.trim()).filter(Boolean) : null;

    const results = await directusServer.request(
        readItems('congress_organisations' as any, {
            filter: {
                congress: { site: { _eq: config.public.siteId } },
                ...(excludeList?.length && { organisation: { type: { _nin: excludeList } } }),
            } as any,
            fields: [
                'sort',
                'partnership_type',
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
        .map((r: any) => r.organisation ? { ...r.organisation, partnership_type: r.partnership_type ?? null } : null)
        .filter(Boolean) as (Organisation & { partnership_type: string | null })[];

    return organisations;
});
