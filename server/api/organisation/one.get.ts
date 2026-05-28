import type { Organisation } from '#shared/types/schema';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const { id } = getQuery(event);

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Organisation ID required' });
	}

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const params = {
		filter: {
			congress: { site: { _eq: config.public.siteId } },
			organisation: { id: { _eq: id as string } },
		} as any,
		fields: [
			'congress',
			'partnership_type',
			'description',
			{
				organisation: [
					'id', 'name', 'short_name', 'abbr', 'address', 'phone',
					'email', 'logo', 'website', 'type', 'description',
					{
						apoa_section_details: [
							'id',
							{
								committees: [
									'id',
									{
										committee: [
											'id', 'title', 'slug', 'congress',
											{
												positions: [
													'id', 'title',
													{
														members: [
															'id',
															{
																persons_id: [
																	'id', 'first_name', 'last_name', 'title',
																	'qualifications', 'image', 'country', 'bio',
																],
															},
														],
													},
												],
											},
										],
									},
								],
							},
						],
					},
				],
			},
		] as any,
		limit: 1,
	};

	const results = await directusServer.request(
		sessionToken
			? withToken(sessionToken, readItems('congress_organisations' as any, params))
			: readItems('congress_organisations' as any, params),
	);

	const result = results[0];
	if (!result || !result.organisation) {
		throw createError({ statusCode: 404, statusMessage: 'Organisation not found' });
	}

	const congressId = (result as any).congress?.id ?? (result as any).congress;
	const org = result.organisation as any;
	org.partnership_type = (result as any).partnership_type ?? null;
	org.partnership_description = (result as any).description ?? null;

	if (org.apoa_section_details) {
		for (const section of org.apoa_section_details) {
			if (section.committees) {
				section.committees = section.committees.filter((c: any) => {
					const committeeCongressId = c.committee?.congress?.id ?? c.committee?.congress;
					return committeeCongressId === congressId;
				});
			}
		}
	}

	return org as Organisation;
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `organisation-${getQuery(event).id}`,
		shouldBypassCache: () => true,
	});
