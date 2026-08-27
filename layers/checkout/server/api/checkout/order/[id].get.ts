import type { H3Event } from 'h3';
import type { TTOrder } from '../../../../app/types/ticket-tailor';

/**
 * A single order's full detail, for the /checkout/order/:id breakdown page.
 * Two ways to prove this is your order:
 *  - A congress_orders row the logged-in customer owns, enforced entirely by
 *    Directus's own permissions for this request's session token (same
 *    check as order.get.ts, but a missing token here means unauthorized
 *    rather than "valid" — this returns real order data, not just a
 *    boolean).
 *  - No session: a verified guest email session (see getCheckoutEmailSession
 *    / orders-access/verify.get.ts) — the order's own `email` field must
 *    match the session's email. This is deliberately different from the
 *    per-order guest token (order-by-token.get.ts), which is NOT accepted
 *    here even as a ?token= fallback: that token is only ever meant to be
 *    read out of persisted basket state right after checkout, never carried
 *    in a URL, and this is a normal bookmarkable/shareable page route. The
 *    email session is safe to accept here instead since it lives in an
 *    httpOnly cookie, not a URL.
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

	let verified = false;
    let congressOrder = null;
	if (userToken) {
		try {
			// `congress_orders` doesn't exist in the generated schema yet — cast
			// until it's created in Directus and `npm run generate:types` picks it up.
			congressOrder = await directusServer.request(
				withToken(
					userToken,
					readItem('congress_orders' as any, orderId, {
						fields: ['id', 'issued_tickets', 'invoices.directus_files_id'],
					}),
				),
			);
			verified = true;
		} catch {
			// Not this session's order — an email session (if any) still gets a
			// shot below.
		}
	}

	if (!verified) {
		const email = await getCheckoutEmailSession(event);

		if (email) {
			try {
				congressOrder = await directusServer.request<{ email: string | null; issued_tickets: unknown; invoices: unknown }>(
					withToken(
						config.directusOrderBotToken as string,
						readItem('congress_orders' as any, orderId, {
							fields: ['email', 'issued_tickets', 'invoices.directus_files_id'],
						}),
					),
				);
				verified = congressOrder.email === email;
			} catch {
				// Order doesn't exist at all — falls through to the same 404 below.
			}
		}
	}

	if (!verified) {
		throw createError({ statusCode: 404, statusMessage: 'Order not found' });
	}

	// Customers have read permission on congress_orders_files (the junction),
	// which is enough to get each file's id back from either branch's own
	// readItem above — but not on directus_files itself, so filename_download
	// has to be filled in with the bot token once ownership is already
	// established. No per-file timestamp needed either way — the M2M's own
	// stored order is oldest-created first, so newest-first is just reverse().
	const invoiceIds: string[] = ((congressOrder as any)?.invoices ?? [])
		.map((row: any) => row.directus_files_id)
		.filter(Boolean)
		.reverse();

	const invoices = invoiceIds.length
		? await directusServer.request<Array<{ id: string; filename_download: string; uploaded_on: string }>>(
				withToken(
					config.directusOrderBotToken as string,
					readFiles({ filter: { id: { _in: invoiceIds } } as any, fields: ['id', 'filename_download', 'uploaded_on'] }),
				),
			).then((files) => invoiceIds.map((id) => files.find((file) => file.id === id)).filter((file): file is { id: string; filename_download: string; uploaded_on: string } => Boolean(file)))
		: [];

	const order = await ticketTailorFetch<TTOrder>(`/orders/${orderId}`, 'orderRead');
	return await omitBypassTicket({...order, local_issued_tickets: congressOrder?.issued_tickets, local_invoices: invoices});
});
