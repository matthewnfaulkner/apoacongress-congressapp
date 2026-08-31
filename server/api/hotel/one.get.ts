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
			// An M2O to a real block_gallery row (reusing the page builder's own
			// gallery block/content model) rather than a plain file list — same
			// shape the Gallery component (app/components/block/Gallery.vue)
			// already expects as its `data` prop, so no adapting needed once
			// fetched. Field selection matches server/api/pages/one.get.ts's own
			// block_gallery query.
			{
				gallery: [
					'id', 'tagline', 'headline',
					{ items: ['id', 'sort', 'caption', { directus_file: ['id', 'filename_download', 'type'] }] },
				],
			},
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

	return hotel as Omit<Hotel, 'gallery'> & {
		congresses: Array<{
			directions: string | null;
			congress: { venue: { title: string | null; location: GeoJSONPoint | null } | null } | null;
		}>;
		// schema.ts still generates gallery as DirectusFile[] | string[] | null
		// (a plain files list) — it hasn't been regenerated since gallery was
		// changed to an M2O block_gallery reference in Directus, so this
		// overrides that stale shape rather than fighting it with casts.
		gallery: {
			id: string;
			tagline: string | null;
			headline: string | null;
			items: Array<{ id: string; sort: number | null; caption: string | null; directus_file: { id: string; filename_download: string; type: string | null } }>;
		} | null;
	};
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `hotel-${getQuery(event).id}`,
		shouldBypassCache: () => true,
	});
