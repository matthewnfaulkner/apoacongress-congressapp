import type { GeoJSONPoint, Hotel } from '#shared/types/schema';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const { id } = getQuery(event);

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Hotel ID required' });
	}

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const hotelParams = {
		filter: {
			congresses: { congress: { site: { _eq: config.public.siteId } } },
		} as any,
		fields: [
			'id', 'name', 'star_rating', 'website', 'phone',
			'address', 'rooms', 'location', 'ammenities',
			{ image: ['id', 'filename_download', 'type'] },
			// venue.location backs the "getting to the congress from here"
			// directions link (see CheckoutHotelDetailsModal.vue) — venues.location
			// exists in Directus (a geometry.Point, same shape as hotels.location)
			// but isn't in the generated schema.ts types yet, hence the casts.
			{ congresses: ['directions', 'tagline', { congress: [{ venue: ['title', 'location'] }] }] },
		] as any,
	};

	const hotel = await directusServer.request(
		sessionToken
			? withToken(sessionToken, readItem('hotels' as any, id as string, hotelParams))
			: readItem('hotels' as any, id as string, hotelParams),
	);

	if (!hotel) {
		throw createError({ statusCode: 404, statusMessage: 'Hotel not found' });
	}

	return hotel as Hotel & {
		congresses: Array<{
			directions: string | null;
			congress: { venue: { title: string | null; location: GeoJSONPoint | null } | null } | null;
		}>;
	};
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `hotel-${getQuery(event).id}`,
		shouldBypassCache: () => true,
	});
