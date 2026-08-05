import type { Person } from '#shared/types/schema';
import type { H3Event } from 'h3';

const personFields = [
	'title', 'id', 'country', 'first_name', 'last_name',
	'qualifications', 'bio', 'affiliations',
	{ image: ['id', 'filename_download', 'type'] },
	{
		committee_positions: [{
			committee_positions_id: [
				'title',
				{ committee: ['title', 'congress', 'slug'] },
			],
		}],
	},
	{
		assignments: [
			'id',
			{
				event: [
					'id', 'title', 'relative_start', 'duration', 'type', 'topic', 'price',
					{
						parent: [
							'id', 'title', 'relative_start', 'duration', 'type', 'topic', 'price',
							{ session: ['*', { schedule: ['*', { day: ['*'] }] }, { room: ['*'] }, { section: ['*'] }] },
						],
					},
					{ session: ['*', { schedule: ['*', { day: ['*'] }] }, { room: ['*'] }, { section: ['*'] }] },
				],
			},
			{ role: ['*'] },
		],
	},
];

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const { preview, token: rawToken, id } = getQuery(event);
	const token = preview === 'true' && rawToken ? String(rawToken) : null;

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];
	const authToken = (token ?? sessionToken) as string;

	const params = {
		filter: { id: { _eq: id as string } },
		limit: 1,
		fields: personFields as any,
		deep: {
			committee_positions: {
				_filter: {
					committee_positions_id: {
						committee: { congress: { site: { _eq: config.public.siteId } } },
					},
				},
			},
			assignments: {
				_filter: {
					event: {
						_or: [
							{ session: { schedule: { day: { congress: { site: { _eq: config.public.siteId } } } } } },
							{ parent: { session: { schedule: { day: { congress: { site: { _eq: config.public.siteId } } } } } } },
						],
					},
				},
			},
		},
	};

	try {
		const personData = await directusServer.request(
			withToken(authToken, readItems('persons', params)),
		);

		if (!personData.length) {
			throw createError({ statusCode: 404, statusMessage: 'Person not found' });
		}

		return personData[0] as unknown as Person;
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Person not found' });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `person-${getQuery(event).id}`,
		shouldBypassCache: () => true,
	});
