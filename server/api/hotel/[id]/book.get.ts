import type { H3Event } from 'h3';

const config = useRuntimeConfig();

/**
 * Redirects to a hotel's real booking URL (which carries its negotiated
 * group/discount code) without ever putting that URL in a page's fetched
 * JSON — see hotel/one.get.ts and hotel/index.get.ts, neither of which
 * select booking_url. This alone stops casual scraping/bulk copy-paste of
 * every hotel's code off the page source; it's not an attendee-only gate
 * (see the brainstorm in this session — the actual abuse risk here is low
 * enough that a login/registration check would be disproportionate
 * friction for what it protects).
 */
export default defineEventHandler(async (event: H3Event) => {
	const id = getRouterParam(event, 'id');

	if (!id) {
		throw createError({ statusCode: 400, statusMessage: 'Hotel ID required' });
	}

	const rows = await directusServer.request<Array<{ booking_url: string | null }>>(
		readItems('congress_hotels' as any, {
			filter: {
				hotel: { _eq: id },
				congress: { site: { _eq: config.public.siteId } },
			} as any,
			fields: ['booking_url'],
			limit: 1,
		}),
	);

	const bookingUrl = rows[0]?.booking_url;

	if (!bookingUrl) {
		throw createError({ statusCode: 404, statusMessage: 'No booking link available for this hotel' });
	}

	return sendRedirect(event, bookingUrl, 302);
});
