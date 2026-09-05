import type { Organisation } from '#shared/types/schema';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const { exclude } = getQuery(event);
	const excludeList = exclude ? String(exclude).split(',').map(s => s.trim()).filter(Boolean) : null;

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const params = {
		filter: {
			congress: { site: { _eq: config.public.siteId } },
			...(excludeList?.length && { organisation: { type: { _nin: excludeList } } }),
		} as any,
		fields: [
			'sort',
			'partnership_type',
			{
				organisation: [
					'id', 'name', 'short_name', 'abbr', 'website', 'type', 'description',
					{ logo: ['id', 'filename_download', 'type'] },
				],
			},
		] as any,
		sort: ['sort'],
		limit: -1,
	};

	const results = await directusServer.request(
		sessionToken
			? withToken(sessionToken, readItems('congress_organisations' as any, params))
			: readItems('congress_organisations' as any, params),
	);

	return results
		.map((r: any) => r.organisation ? { ...r.organisation, partnership_type: r.partnership_type ?? null } : null)
		.filter(Boolean) as (Organisation & { partnership_type: string | null })[];
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `organisations-${getQuery(event).exclude ?? ''}`,
	});
