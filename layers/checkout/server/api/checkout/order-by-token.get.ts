import type { H3Event } from 'h3';
import type { TTOrder } from '../../../app/types/ticket-tailor';

/**
 * A single order's full detail for a guest checkout, looked up via the
 * random token bundle.post.ts mints in place of a session (see
 * CreateBundleResponse.guestToken). Deliberately its own separate route from
 * /checkout/order/:id rather than a ?token= fallback there — that's a normal
 * bookmarkable page route, and this token must only ever grant access when
 * read straight out of the persisted checkout basket store on the
 * confirmation page right after checkout, never carried in a shareable URL.
 *
 * Reads via the privileged server token rather than a user session, since
 * there's no session to read with — the token comparison below is what
 * actually gates access, not Directus's own row-level permissions.
 */
export default defineEventHandler(async (event: H3Event): Promise<TTOrder> => {
	const config = useRuntimeConfig();
	const query = getQuery(event);
	const orderId = typeof query.tt_order_id === 'string' ? query.tt_order_id : null;
	const token = typeof query.token === 'string' ? query.token : null;

	if (!orderId || !token) {
		throw createError({ statusCode: 400, statusMessage: 'tt_order_id and token are required' });
	}

	let congressOrder: { token: string | null; invoices?: Array<{ directus_files_id: string | null }> } | null;
	try {
		// `congress_orders` doesn't exist in the generated schema yet — cast
		// until it's created in Directus and `npm run generate:types` picks it up.
		congressOrder = await directusServer.request(
			withToken(
				config.directusOrderBotToken as string,
				readItem('congress_orders' as any, orderId, { fields: ['token', 'invoices.directus_files_id'] }),
			),
		);
	} catch {
		throw createError({ statusCode: 404, statusMessage: 'Order not found' });
	}

	if (!congressOrder?.token || congressOrder.token !== token) {
		throw createError({ statusCode: 403, statusMessage: 'Invalid order token' });
	}

	// Same reasoning as order/[id].get.ts's own invoices lookup — the file id
	// is readable off congress_orders itself with the bot token, but
	// filename/date need a separate directus_files read.
	const invoiceIds: string[] = (congressOrder.invoices ?? [])
		.map((row) => row.directus_files_id)
		.filter((id): id is string => Boolean(id))
		.reverse();

	const invoices = invoiceIds.length
		? await directusServer
				.request<Array<{ id: string; filename_download: string; uploaded_on: string }>>(
					withToken(
						config.directusOrderBotToken as string,
						readFiles({ filter: { id: { _in: invoiceIds } } as any, fields: ['id', 'filename_download', 'uploaded_on'] }),
					),
				)
				.then((files) => invoiceIds.map((id) => files.find((file) => file.id === id)).filter((file): file is { id: string; filename_download: string; uploaded_on: string } => Boolean(file)))
		: [];

	const order = await ticketTailorFetch<TTOrder>(`/orders/${orderId}`, 'orderRead');
	return await omitBypassTicket({ ...order, local_invoices: invoices });
});
