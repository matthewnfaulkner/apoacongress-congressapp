import type { H3Event } from 'h3';
import type { TTOrder } from '../../../../app/types/ticket-tailor';

/**
 * A single order's full detail, for the /checkout/order/:id breakdown page.
 * Ownership check is the same as order.get.ts (a congress_orders row the
 * logged-in customer owns, enforced entirely by Directus's own permissions
 * for this request's session token) — but unlike that route, a missing token
 * here means unauthorized rather than "valid": this returns real order data,
 * not just a boolean.
 *
 * Session-only, deliberately — no token-based fallback. A guest checkout's
 * order token (see order-by-token.get.ts) is only ever meant to be read out
 * of the persisted checkout basket store on the confirmation page right
 * after checkout, never carried in a URL — this is a normal page route
 * (bookmarkable, shows up in browser history, gets shared/copy-pasted), so
 * it must never become a valid place for that token to grant access.
 */
export default defineEventHandler(async (event: H3Event): Promise<TTOrder> => {
	const config = useRuntimeConfig();
	const orderId = getRouterParam(event, 'id');

	if (!orderId) {
		throw createError({ statusCode: 400, statusMessage: 'orderId is required' });
	}

	const cookies = parseCookies(event);
	// Production: access token sent as Authorization: Bearer header (localStorage-based json auth)
	// Sandbox: session token in cookie (cookie-based session auth)
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = cookies[config.sessionTokenName as string] || null;
	const userToken = bearerToken ?? sessionToken;

	if (!userToken) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
	}

	try {
		// `congress_orders` doesn't exist in the generated schema yet — cast until
		// it's created in Directus and `npm run generate:types` picks it up.
		await directusServer.request(withToken(userToken, readItem('congress_orders' as any, orderId, { fields: ['id'] })));
	} catch {
		throw createError({ statusCode: 404, statusMessage: 'Order not found' });
	}

	const order = await ticketTailorFetch<TTOrder>(`/orders/${orderId}`, 'orderRead');
	return await omitBypassTicket(order);
});
