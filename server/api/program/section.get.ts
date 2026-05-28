import type { CongressDay, CongressSession } from '#shared/types/schema';
import type { H3Event } from 'h3';

const sectionFields = [
    'id', 'title', 'starttime', 'endtime', 'tags',
    { rooms: [{ room: ['title'] }] },
    { organisers: ['id', { organisation: ['id', 'name', 'short_name', 'abbr', 'type'] }] },
    { section: ['*'] },
    { day: ['*'] },
    {
        events: [
            'id', 'relative_start', 'duration', 'title',
            {
                type: ['id', 'collection', {
                    item: {
                        plenaries: ['id', 'topic'],
                        symposiums: ['*'],
                        workshops: ['id'],
                        talks: ['id', 'topic'],
                    },
                }],
            },
            {
                children: [
                    'id', 'relative_start', 'duration', 'title',
                    {
                        type: ['id', 'collection', {
                            item: {
                                plenaries: ['id', 'topic'],
                                discussions: ['id', 'topic'],
                                symposiums: ['*'],
                                workshops: ['id'],
                                talks: ['id', 'topic'],
                            },
                        }],
                    },
                    { assignments: ['*', { person: ['id', 'first_name', 'last_name', 'country'] }, { role: ['*'] }] },
                ],
            },
            { assignments: ['*', { person: ['id', 'first_name', 'last_name', 'country'] }, { role: ['*'] }] },
        ],
    },
    {
        schedule: [
            '*',
            { day: ['*', { congress: [{ venue: [{ rooms: ['id', 'title'] }] }] }] },
        ],
    },
];

const config = useRuntimeConfig();

async function handler(event: H3Event) {
    const query = getQuery(event);
    const { preview, token: rawToken, id } = query;
    const token = preview === 'true' && rawToken ? String(rawToken) : null;

    const cookies = parseCookies(event);
    const sessionToken = cookies[config.sessionTokenName];
    const authToken = (token ?? sessionToken) as string;

    try {
        const sectionData = await directusServer.request(
            withToken(
                authToken,
                readItems('congress_sessions', {
                    fields: sectionFields as any,
                    sort: ['schedule.day.sort', 'starttime'] as any,
                    filter: {
                        organisers: { organisation: { id: { _eq: id as string } } },
                        schedule: { status: { _eq: 'published' } },
                    },
                    deep: {
                        schedule: {
                            day: {
                                _sort: 'sort',
                                _filter: { congress: { site: { _eq: config.public.siteId } } },
                            },
                        },
                        events: { children: { _sort: 'relative_start' }, _sort: 'relative_start' },
                        _sort: 'starttime',
                    },
                }),
            ),
        );

        if (!sectionData.length) {
            throw createError({ statusCode: 404, statusMessage: 'Section not found' });
        }

        return sectionData as unknown as CongressSession[];
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Section not found' });
    }
}

export default config.public.isSandbox
    ? eventHandler(handler)
    : cachedEventHandler(handler, {
        maxAge: 60,
        getKey: (event) => `section-${getQuery(event).id}`,
        shouldBypassCache: () => true,
    });
