import type { H3Event } from 'h3';
import type { TTOrder } from '../../../app/types/ticket-tailor';

/**
 * Looks up every order the current user has for this congress, and returns
 * each one fetched fresh from Ticket Tailor, newest first. congress_orders
 * only supplies the order ids here; every other field rendered comes
 * straight from Ticket Tailor.
 *
 * Two ways to identify "the current user": a real session (their own token,
 * so Directus's own permissions decide what they can see, same as
 * order.get.ts) filtered by `user`, or — no session at all — a verified
 * guest email session (see getCheckoutEmailSession /
 * orders-access/verify.get.ts) filtered by `email` instead, read via the
 * bot token since there's no Directus user account behind a guest at all.
 *
 * NOTE: assumes congress_orders has a `congress` relation chained to `site`
 * the same way hotel/one.get.ts's `congresses.congress.site` filter does —
 * unverified against congress_orders' actual schema, since it's not in the
 * generated types yet. Correct the filter field if this is wrong.
 */
async function resolveOrders(event: H3Event): Promise<TTOrder[]> {
	const config = useRuntimeConfig();

    const cookies = parseCookies(event);
	// Production: access token sent as Authorization: Bearer header (localStorage-based json auth)
	// Sandbox: session token in cookie (cookie-based session auth)
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = cookies[config.sessionTokenName as string] || null;
	const userToken = bearerToken ?? sessionToken;

	let rows: Array<{ id: string }>;

	if (userToken) {
		let me: { id: string };
		try {
			me = await directusServer.request<{ id: string }>(withToken(userToken, readMe({ fields: ['id'] } as any)));
		} catch (e) {
			console.error('[my-orders] readMe failed for provided token:', e);
			throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session.' });
		}

		rows = await directusServer.request<Array<{ id: string }>>(
			withToken(
				userToken,
				readItems('congress_orders' as any, {
					filter: {
						user: { _eq: me.id },
						congress: { site: { _eq: config.public.siteId } },
					},
					fields: ['id'],
					sort: ['-date_created'],
					limit: -1,
				} as any),
			),
		);
	} else {
		const email = await getCheckoutEmailSession(event);

		if (!email) {
			throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
		}

		rows = await directusServer.request<Array<{ id: string }>>(
			withToken(
				config.directusOrderBotToken as string,
				readItems('congress_orders' as any, {
					filter: {
						email: { _eq: email },
						congress: { site: { _eq: config.public.siteId } },
					},
					fields: ['id'],
					sort: ['-date_created'],
					limit: -1,
				} as any),
			),
		);
	}

	if (rows.length === 0) {
		return [];
	}

	const orders = await Promise.all(rows.map((row) => ticketTailorFetch<TTOrder>(`/orders/${row.id}`, 'orderRead')));
	return await Promise.all(orders.map(omitBypassTicket));
}

export default defineEventHandler(resolveOrders);
