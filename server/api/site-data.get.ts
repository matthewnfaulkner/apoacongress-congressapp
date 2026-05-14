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
						'logo_dark_mode',
						'social_links',
						'preview',
						'favicon',
						{
							support_form: [
								'id',
								'title',
								'submit_label',
								'success_message',
								'on_success',
								'success_redirect_url',
								'is_active',
								{
									fields: [
										'id',
										'name',
										'type',
										'label',
										'placeholder',
										'help',
										'validation',
										'width',
										'choices',
										'required',
										'sort',
										'use_user_data'
									],
								},
							],
						},
						{
							'congress' : [
								'*',
								{
									'venue' : [
										'id',
										'title'
									]
								},
								{
									organisations: [
										'*',
										{
											organisation: [
												'id',
												'type',
												'name',
												'short_name',
												'abbr',
												'logo'
											]
										
										}
									]
								},
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
	} catch (error){
		
		throw createError({ statusCode: 500, statusMessage: error instanceof Error ? error.message : String(error) });

	}
});
