import { z } from 'zod';
import type { H3Event } from 'h3';

const querySchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(6),
	page: z.coerce.number().min(1).default(1),
});

const scheduleFields = [
	'id',
	'title',
	'startdate',
	'enddate',
	{
		venue: ['id', 'title', { rooms: ['id', 'title'] }],
	},
	{
		days: [
			'id', 'key', 'title', 'time_subdivision', 'starttime', 'endtime',
			{ timeslots: ['id', 'starttime', 'endtime'] },
			{
				schedules: [
					'id', 'name', 'status', 'preliminary',
					{ breaks: ['id', 'name', 'starttime', 'endtime', { rooms: ['id', 'room'] }] },
					{
						sessions: [
							'*',
							{ rooms: [{ room: ['*'] }] },
							{ organisers: ['id', { organisation: ['id', 'name', 'short_name', 'abbr'] }] },
							{
								events: [
									'id', 'relative_start', 'duration', 'title', 'type', 'topic', 'price', 'abstract_submission',
									{
										children: [
											'id', 'relative_start', 'duration', 'title', 'type', 'topic', 'price', 'abstract_submission',
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
		],
	},
];

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const query = await getValidatedQuery(event, querySchema.safeParse);

	if (!query.success) {
		throw createError({ statusCode: 400, message: 'Invalid query parameters' });
	}

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const scheduleParams = {
		limit: 1,
		fields: scheduleFields as any,
		filter: { site: { _eq: config.public.siteId } },
		deep: {
			days: {
				schedules: {
					_filter: { status: { _eq: 'published' } },
					sessions: {
						_sort: 'starttime',
						events: { _sort: 'relative_start', children: { _sort: 'relative_start' } },
					},
				},
				timeslots: { _sort: 'starttime', _limit: -1 },
			},
		},
	};

	try {
		const scheduleData = await directusServer.request(
			sessionToken
				? withToken(sessionToken, readItems('congress', scheduleParams as any))
				: readItems('congress', scheduleParams as any),
		);

		if (!scheduleData.length) {
			throw createError({ statusCode: 404, statusMessage: 'Schedule not found' });
		}

		return scheduleData[0] as unknown as Congress;
	} catch {
		throw createError({ statusCode: 500, message: 'Failed to fetch schedule' });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 60,
		getKey: () => 'schedule',
		shouldBypassCache: () => true,
	});
