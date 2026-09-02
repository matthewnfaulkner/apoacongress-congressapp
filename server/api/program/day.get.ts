import type { CongressDay } from '#shared/types/schema';
import type { H3Event } from 'h3';

const dayFields = [
    'title', 'id', 'key', 'starttime', 'endtime', 'time_subdivision',
    { timeslots: ['id', 'starttime', 'endtime'] },
    { congress: ['id', { venue: [{ rooms: ['id', 'title'] }] }] },
    {
        schedules: [
            'id', 'name', 'status', 'parent', 'user_created', 'preliminary',
            { breaks: ['id', 'name', 'starttime', 'endtime', { rooms: ['id', 'room'] }] },
            {
                sessions: [
                    '*',
                    { section: ['id', { organisation: ['id', 'name', 'short_name', 'abbr'] }] },
                    { organisers: ['id', { organisation: ['id', 'name', 'short_name', 'abbr', 'type'] }] },
                    { rooms: [{ room: ['*'] }] },
                    {
                        events: [
                            'id', 'relative_start', 'duration', 'title', 'type', 'topic', 'price',
                            {
                                children: [
                                    'id', 'relative_start', 'duration', 'title', 'type', 'topic', 'price',
                                    { assignments: ['*', { person: ['id', 'first_name', 'last_name', 'country'] }, { role: ['*'] }] },
                                ],
                            },
                            { assignments: ['*', { person: ['id', 'first_name', 'last_name', 'country'] }, { role: ['*'] }] },
                        ],
                    },
                ],
            },
        ],
    },
];

const config = useRuntimeConfig();

async function handler(event: H3Event) {
    const query = getQuery(event);
    const { preview, token: rawToken, key, all } = query;
    const token = preview === 'true' && rawToken ? String(rawToken) : null;

    const cookies = parseCookies(event);
    const sessionToken = cookies[config.sessionTokenName];
    const authToken = (token ?? sessionToken) as string;

    try {
        const dayData = await directusServer.request(
            withToken(
                authToken,
                readItems('congress_days', {
                    limit: 1,
                    fields: dayFields as any,
                    filter: {
                        key: { _eq: key as string },
                        congress: { site: { _eq: config.public.siteId } },
                        ...(all !== 'true' && { schedules: { status: { _eq: 'published' } } }),
                    },
                    deep: {
                        timeslots: { _sort: 'starttime' },
                        schedules: {
                            // Should be exactly one published schedule per day, but if a
                            // content mistake leaves two marked published at once, this
                            // caps it to just the most recently touched one instead of
                            // fetching (and rendering) every session twice.
                            _limit: 1,
                            _sort: '-date_updated',
                            sessions: {
                                events: { children: { _sort: 'relative_start' }, _sort: 'relative_start' },
                                _sort: 'starttime',
                            },
                        },
                    },
                }),
            ),
        );

        if (!dayData.length) {
            throw createError({ statusCode: 404, statusMessage: 'Day not found' });
        }

        return dayData[0] as unknown as CongressDay;
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Day not found' });
    }
}

export default config.public.isSandbox
    ? eventHandler(handler)
    : cachedEventHandler(handler, {
        maxAge: 60,
        getKey: (event) => `day-${getQuery(event).key}`,
        shouldBypassCache: () => true,
    });
