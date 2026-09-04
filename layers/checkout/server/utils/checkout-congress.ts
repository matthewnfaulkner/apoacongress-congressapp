import type { TTOrder } from '../../app/types/ticket-tailor';

export interface CongressConfig {
	tt_event_id: string | null;
	tt_bypass_id: string | null;
}

/**
 * This site's congress row (Directus `congress`, filtered by site) — the
 * Ticket Tailor event id and $0 bypass ticket id live on the same row, so
 * every caller needing either (or both, as bundle.post.ts and event.get.ts
 * do) shares one query instead of two separate single-field ones.
 *
 * tt_event_id replaces the old TICKET_TAILOR_EVENT_ID / TICKET_TAILOR_EVENT_ID_INTL
 * env vars (national vs international event) — the national one was already
 * dead in practice (its configured id, ev_8850256, 404s against Ticket
 * Tailor's own API), so this just resolves the one real event directly
 * instead of branching on locality first.
 *
 * tt_bypass_id is a real Ticket Tailor ticket that satisfies Ticket Tailor's
 * own "requires a registration ticket" bundle dependency without actually
 * charging for one. Needed for the "add to an existing order" flow (see
 * bundle.post.ts): the customer already has a real registration on their
 * original order, so a follow-up bundle has no registration line of its
 * own, but Ticket Tailor still needs *something* it'll accept as one.
 */
export async function getCongressConfig(): Promise<CongressConfig> {
	const config = useRuntimeConfig();

	const rows = await directusServer.request<CongressConfig[]>(
		withToken(
			config.directusOrderBotToken as string,
			readItems('congress', {
				filter: { site: { _eq: config.public.siteId } } as any,
				limit: 1,
				fields: ['tt_event_id', 'tt_bypass_id'],
			}),
		),
	);

	return rows[0] ?? { tt_event_id: null, tt_bypass_id: null };
}

/**
 * Strips the $0 bypass ticket (see getCongressConfig) out of an order's
 * issued_tickets before it reaches any customer-facing page — it's an
 * internal stand-in for Ticket Tailor's own bundle dependency check, not a
 * real purchase, and showing it in a "Tickets" list would just be confusing
 * clutter.
 */
export async function omitBypassTicket(order: TTOrder): Promise<TTOrder> {
	const { tt_bypass_id: bypassTicketTypeId } = await getCongressConfig();

	if (!bypassTicketTypeId || !order.issued_tickets) return order;

	return {
		...order,
		issued_tickets: order.issued_tickets.filter((ticket) => ticket.ticket_type_id !== bypassTicketTypeId),
	};
}
