import { z } from 'zod';

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
		venue: [
			'id',
			'title',
			{
				rooms: [
					'id',
					'title',
				]
			}
		]
	},
	{
		days: [
			'id',
			'key',
			'title',
			'time_subdivision',
			'starttime',
			'endtime',
			{
				timeslots:  [
					'id',
					'starttime',
					'endtime',
				]
			},
			{
				schedules: [
					'id',
					'name',
					'status',
					{
						breaks: [
							'id',
							'name',
							'starttime',
							'endtime',
							{
								rooms: [
									'id',
									'room'
								]
							}
						]
					},
					{
						sessions: [
							'*',
							{
								rooms: [
									{
										room: ['*']
									}
								]
							},
							{
								events: [
									'id',
									'relative_start',
									'duration',
									'title',
									{
										type: [
											'id',
											'collection',
											{
												item: {
													plenaries: ['id', 'topic'],
													discussion: ['id', 'topic'],
													symposiums: ['*'],
													workshops: ['id'],
													talks: ['id', 'topic'],
												}
											},
										]
									},
									{
										children: [
											'id',
											'relative_start',
											'duration',
											'title',
											{
												type: [
													'id',
													'collection',
													{
														item: {
															plenaries: ['id', 'topic'],
															symposiums: ['id', 'topic'],
															workshops: ['id'],
															talks: ['id', 'topic'],
														}
													},
												]
											},
											{
												assignments: [
													'*',
													{ person: ['id', 'first_name', 'last_name', 'country'] },
													{ role: ['*'] }
												]
											}
										]
									},
									{
										assignments: [
											'*',
											{ person: ['id', 'first_name', 'last_name', 'country'] },
											{ role: ['*'] }
										]
									}
								]
							}
						]
					},
				]
			}
		]
	},

];

export default defineEventHandler(async (event) => {
	const query = await getValidatedQuery(event, querySchema.safeParse);

	const config = useRuntimeConfig();

	if (!query.success) {
		throw createError({ statusCode: 400, message: 'Invalid query parameters' });
	}

	const { limit, page } = query.data;

	try {
		let schedule: Congress;

		const scheduleData = await directusServer.request(
			readItems('congress', {
				limit: 1,
				fields: scheduleFields as any,
				filter: {
					site:{
						_eq: config.public.siteId
					}
				},
				deep: {
					days: {
						schedules: {
							_filter:{
								status: {
									_eq: 'published'
								}
							},
							sessions: {
								_sort: 'starttime',
								events: {
									_sort: 'relative_start',
									children: {
										_sort: 'relative_start'
									}
								}
							}
						},
						timeslots: {
							_sort: "starttime",
							_limit: -1
						}
					}
				}
			}),
		);



		if (!scheduleData.length) {
			throw createError({ statusCode: 404, statusMessage: 'Schedule not found' });
		}

		schedule = scheduleData[0] as Congress;

		return schedule;
	} catch {
		throw createError({ statusCode: 500, message: 'Failed to fetch schedule' });
	}
});
