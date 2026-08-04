import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	try {
		const [globals, scientific_tags, site, headerNavigation, footerNavigation] = await Promise.all([
			directusServer.request(
				sessionToken
					? withToken(sessionToken, readSingleton('globals', {
						fields: [
							'title', 'description', 'social_links', 'accent_color',
							{ logo: ['id', 'filename_download', 'type'] },
							{ logo_dark_mode: ['id', 'filename_download', 'type'] },
							{ favicon: ['id', 'filename_download', 'type'] },
						],
					}))
					: readSingleton('globals', {
						fields: [
							'title', 'description', 'social_links', 'accent_color',
							{ logo: ['id', 'filename_download', 'type'] },
							{ logo_dark_mode: ['id', 'filename_download', 'type'] },
							{ favicon: ['id', 'filename_download', 'type'] },
						],
					}),
			),
			directusServer.request(
				sessionToken
					? withToken(sessionToken, readItems('scientific_tags', {
						limit: -1,
						fields: ['id', 'tag', 'color'],
					}))
					: readItems('scientific_tags', {
						limit: -1,
						fields: ['id', 'tag', 'color'],
					}),
			),
			directusServer.request(
				sessionToken
					? withToken(sessionToken, readItem('sites', config.public.siteId, {
						fields: [
							'title', 'description', 'social_links', 'preview',
							{ logo: ['id', 'filename_download', 'type'] },
							{ logo_dark_mode: ['id', 'filename_download', 'type'] },
							{ favicon: ['id', 'filename_download', 'type'] },
							{
								'congress': [
									'*',
									{ days: ['key', 'title'] },
									{ 'venue': ['id', 'title'] },
									{
										organisations: [
											'*',
											{
												organisation: [
													'id', 'type', 'name', 'short_name', 'abbr',
													{ logo: ['id', 'filename_download', 'type'] },
												],
											},
										],
									},
									{
										'organiser': [
											'id', 'name', 'email', 'address', 'phone',
											{ logo: ['id', 'filename_download', 'type'] },
										],
									},
								],
							},
						],
					}))
					: readItem('sites', config.public.siteId, {
						fields: [
							'title', 'description', 'social_links', 'preview',
							{ logo: ['id', 'filename_download', 'type'] },
							{ logo_dark_mode: ['id', 'filename_download', 'type'] },
							{ favicon: ['id', 'filename_download', 'type'] },
							{
								'congress': [
									'*',
									{ days: ['key', 'title'] },
									{ 'venue': ['id', 'title'] },
									{
										organisations: [
											'*',
											{
												organisation: [
													'id', 'type', 'name', 'short_name', 'abbr',
													{ logo: ['id', 'filename_download', 'type'] },
												],
											},
										],
									},
									{
										'organiser': [
											'id', 'name', 'email', 'address', 'phone',
											{ logo: ['id', 'filename_download', 'type'] },
										],
									},
								],
							},
						],
					}),
			),
			directusServer.request(
				sessionToken
					? withToken(sessionToken, readItems('navigation', {
						limit: 1,
						filter: { _and: [{ key: { _eq: 'main' } }, { site: { id: { _eq: config.public.siteId } } }] },
						fields: ['id', 'title', {
							items: ['id', 'title', 'url', 'type',
								{ translations: ['languages_code', 'title'] },
								{ page: ['id', 'permalink'], post: ['id', 'slug'],
									children: ['id', 'title', 'url', 'type',
										{ translations: ['languages_code', 'title'] },
										{ page: ['id', 'permalink'], post: ['id', 'slug'],
											children: ['id', 'title', 'url', 'type',
												{ translations: ['languages_code', 'title'] },
												{ page: ['id', 'permalink'], post: ['id', 'slug'] },
											],
										},
									],
								},
							],
						}],
						deep: { items: { _sort: ['sort'], children: { children: { _sort: ['sort'] }, _sort: ['sort'] } } },
					}))
					: readItems('navigation', {
						limit: 1,
						filter: { _and: [{ key: { _eq: 'main' } }, { site: { id: { _eq: config.public.siteId } } }] },
						fields: ['id', 'title', {
							items: ['id', 'title', 'url', 'type',
								{ translations: ['languages_code', 'title'] },
								{ page: ['id', 'permalink'], post: ['id', 'slug'],
									children: ['id', 'title', 'url', 'type',
										{ translations: ['languages_code', 'title'] },
										{ page: ['id', 'permalink'], post: ['id', 'slug'],
											children: ['id', 'title', 'url', 'type',
												{ translations: ['languages_code', 'title'] },
												{ page: ['id', 'permalink'], post: ['id', 'slug'] },
											],
										},
									],
								},
							],
						}],
						deep: { items: { _sort: ['sort'], children: { children: { _sort: ['sort'] }, _sort: ['sort'] } } },
					}),
			),
			directusServer.request(
				sessionToken
					? withToken(sessionToken, readItems('navigation', {
						limit: 1,
						filter: { _and: [{ key: { _eq: 'footer' } }, { site: { id: { _eq: config.public.siteId } } }] },
						fields: ['id', 'title', {
							items: ['id', 'title', 'url', 'type',
								{ page: ['id', 'permalink'], post: ['id', 'slug'],
									children: ['id', 'title', 'url', 'type', { page: ['id', 'permalink'], post: ['id', 'slug'] }],
								},
							],
						}],
						deep: { items: { _sort: ['sort'], children: { _sort: ['sort'] } } },
					}))
					: readItems('navigation', {
						limit: 1,
						filter: { _and: [{ key: { _eq: 'footer' } }, { site: { id: { _eq: config.public.siteId } } }] },
						fields: ['id', 'title', {
							items: ['id', 'title', 'url', 'type',
								{ page: ['id', 'permalink'], post: ['id', 'slug'],
									children: ['id', 'title', 'url', 'type', { page: ['id', 'permalink'], post: ['id', 'slug'] }],
								},
							],
						}],
						deep: { items: { _sort: ['sort'], children: { _sort: ['sort'] } } },
					}),
			),
		]);

		return { globals, scientific_tags, site, headerNavigation, footerNavigation };
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 60,
		getKey: () => 'site-data',
		shouldBypassCache: () => true,
	});
