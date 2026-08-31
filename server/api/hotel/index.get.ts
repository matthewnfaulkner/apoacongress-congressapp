import type { CongressHotel } from '#shared/types/schema';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	// Queried through congress_hotels (the congress <-> hotel junction) rather
	// than filtering the hotels collection itself — sort and tagline are both
	// per-congress fields that live on the junction, not on the hotel, so a
	// hotel used by multiple congresses can be ordered/labelled differently
	// for each one.
	const params = {
		filter: {
			congress: { site: { _eq: config.public.siteId } },
		} as any,
		fields: [
			'tagline', 'sort',
			{
				hotel: [
					'id', 'name', 'star_rating', 'address', 'rooms', 'ammenities',
					{ image: ['id', 'filename_download', 'type'] },
				],
			},
		] as any,
		sort: ['sort'],
		limit: -1,
	};

	// Returned as-is rather than flattened — hotel is deep-fetched above so
	// it's a real object here despite the SDK's loose Hotel | string | null
	// typing, same trust-the-fetched-shape approach used elsewhere (e.g.
	// order/[id].get.ts's local_issued_tickets). Frontend reads row.hotel.*
	// and row.tagline directly instead of a reshaped/merged object.
	return directusServer.request<CongressHotel[]>(
		sessionToken
			? withToken(sessionToken, readItems('congress_hotels' as any, params))
			: readItems('congress_hotels' as any, params),
	);
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: () => 'hotels',
		shouldBypassCache: () => true,
	});
