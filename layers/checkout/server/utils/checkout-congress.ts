import type { TTOrder } from '../../app/types/ticket-tailor';

/**
 * The Ticket Tailor event id for this site's congress (Directus
 * congress.tt_event_id) — replaces the old TICKET_TAILOR_EVENT_ID /
 * TICKET_TAILOR_EVENT_ID_INTL env vars (national vs international event).
 * The national one was already dead in practice — its configured id
 * (ev_8850256) 404s against Ticket Tailor's own API — so this just resolves
 * the one real event directly instead of branching on locality first.
 */
export async function getCongressEventId(): Promise<string | null> {
	const config = useRuntimeConfig();

	const rows = await directusServer.request<Array<{ tt_event_id: string | null }>>(
		readItems('congress', {
			filter: { site: { _eq: config.public.siteId } } as any,
			limit: 1,
			fields: ['tt_event_id'],
		}),
	);

	return rows[0]?.tt_event_id ?? null;
}

/**
 * The $0 "bypass" ticket type configured on this site's congress (Directus
 * congress.tt_bypass_id) — a real Ticket Tailor ticket that satisfies Ticket
 * Tailor's own "requires a registration ticket" bundle dependency without
 * actually charging for one. Needed for the "add to an existing order" flow
 * (see bundle.post.ts): the customer already has a real registration on
 * their original order, so a follow-up bundle has no registration line of
 * its own, but Ticket Tailor still needs *something* it'll accept as one.
 */
export async function getCongressBypassTicketId(): Promise<string | null> {
	const config = useRuntimeConfig();

	const rows = await directusServer.request<Array<{ tt_bypass_id: string | null }>>(
		readItems('congress', {
			filter: { site: { _eq: config.public.siteId } } as any,
			limit: 1,
			fields: ['tt_bypass_id'],
		}),
	);

	return rows[0]?.tt_bypass_id ?? null;
}

/**
 * Strips the $0 bypass ticket (see getCongressBypassTicketId) out of an
 * order's issued_tickets before it reaches any customer-facing page — it's
 * an internal stand-in for Ticket Tailor's own bundle dependency check, not
 * a real purchase, and showing it in a "Tickets" list would just be
 * confusing clutter.
 */
export async function omitBypassTicket(order: TTOrder): Promise<TTOrder> {
	const bypassTicketTypeId = await getCongressBypassTicketId();

	if (!bypassTicketTypeId || !order.issued_tickets) return order;

	return {
		...order,
		issued_tickets: order.issued_tickets.filter((ticket) => ticket.ticket_type_id !== bypassTicketTypeId),
	};
}
