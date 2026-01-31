import { z } from 'zod';
import type { CongressSchedule } from '~~/shared/types/schema';


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
							'starttime',
							'endtime',
							'name',
							{
								rooms: [
									'room'
								]
							}
						]
					},
					{
						sessions: [
							'id',
							'title',
							'starttime',
							'endtime',
							{
								day: [
									'id'
								]
							},
							{
								events: [
									'id',
									'title',
									'relative_start',
									'duration',
									{
									children: [
										'id',
										'title',
										'relative_start',
										'duration',
										{
											type: [
												'id',
												'collection',
												{
													item: [
														'id',
														
													]
												},
											]
										},
										{
											assignments: [
													{
														person: [
															'id',
															'first_name',
															'last_name'
														]
													},
													{
														role: [
															'id',
															'name'
														]
													}
											]
										}
									]
								},
									{
										type: [
											'id',
											'collection',
											{
												item: [
													'id',
													
												]
											},
										]
									},
									{
										assignments: [
												{
													person: [
														'id',
														'first_name',
														'last_name'
													]
												},
												{
													role: [
														'id',
														'name'
													]
												}
										]
									}
								]
							},
							{
								room: [
									'id'
								]
							},
							{
								section: [
									'id',
									'name',
									'color'
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
		let schedule: CongressSchedule;

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
						},
						timeslots: {
							_sort: "starttime",
							_limit: -1.
						}
								
						}
					}
			}),
		);



		if (!scheduleData.length) {
			throw createError({ statusCode: 404, statusMessage: 'Schedule not found' });
		}

		schedule = scheduleData[0] as CongressSchedule;

		return schedule;
	} catch {
		throw createError({ statusCode: 500, message: 'Failed to fetch schedule' });
	}
});
