export default defineEventHandler(async (event) => {
	try {
		const config = useRuntimeConfig();

		const [globals, site, headerNavigation, footerNavigation] = await Promise.all([
			directusServer.request(
				readSingleton('globals', {
					fields: ['title', 'description', 'logo', 'logo_dark_mode', 'social_links', 'accent_color', 'favicon'],
				}),
			),
			directusServer.request(
				readItem('sites',  config.public.siteId, {
					fields: [
						'title', 
						'description', 
						'logo',
						'social_links',
						{
							'congress' : [
								'*',
								{
									'organiser' : [
										'id',
										'name',
										'email',
										'logo',
										'address',
										'phone',
									]
								}
							]
						}
					],
				}),
			),
			directusServer.request(
				readItems('navigation', {
					limit: 1,
					filter: {
						_and: [
						{
							'key' : {
								_eq : 'main'}
						},
						{
							'site': {
								'id': {
									_eq: config.public.siteId
								}
							}
						}
						
						]
					},
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								'url',
								'type',
								{
									translations:[
										'languages_code',
										'title'
									]
								},
								{
									page: ['id', 'permalink'],
									post: ['id', 'slug'],
									children: ['id', 'title', 'url', 'type',
										{
											translations:[
												'languages_code',
												'title'
											]
										},
										{
											page: ['id', 'permalink'],
											post: ['id', 'slug'],
											children: ['id', 'title', 'url', 'type',
												{
													translations:[
														'languages_code',
														'title'
													]
												},
												{
													page: ['id', 'permalink'],
													post: ['id', 'slug'],

												}
											],

										}
									],
								},
							],
						},
					],
					deep: {
						items: {
							_sort: ['sort'],
							children: {
								children: {
									_sort: ['sort'],
								},
								_sort: ['sort'],
							},
						},
					},
				}),
			),

			directusServer.request(
				readItems('navigation', {
					limit: 1,
					filter: {
						_and: [
						{
							'key' : {
								_eq : 'footer'}
						},
						{
							'site': {
								'id': {
									_eq: config.public.siteId
								}
							}
						}
						
						]
					},
					fields: [
						'id',
						'title',
						{
							items: [
								'id',
								'title',
								'url',
								'type',
								{
									page: ['id', 'permalink'],
									post: ['id', 'slug'],
									children: ['id', 'title', 'url', 'type', {
										page: ['id', 'permalink'],
										post: ['id', 'slug']
									}],
								},
							],
						},
					],
					deep: {
						items: {
							_sort: ['sort'],
							children: {
								_sort: ['sort'],
							},
						},
					},
				}),
			),
		]);

		return { globals, site, headerNavigation, footerNavigation };
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
	}
});
