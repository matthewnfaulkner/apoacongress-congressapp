import type { H3Event } from 'h3';
import type { TTEvent } from '../../../app/types/ticket-tailor';
import type { CheckoutEvent } from '../../../app/types/checkout';
import { getCongressConfig } from '../../utils/checkout-congress';
const config = useRuntimeConfig();

// One Ticket Tailor event now (see getCongressConfig/congress.tt_event_id)
// rather than a separate event per locality — the old TICKET_TAILOR_EVENT_ID
// / _INTL env vars this replaced only ever had one working event behind
// them anyway, so there's nothing left to pick between here. `locality`
// still gets tagged onto the response below (see the outer handler) purely
// for currency display purposes, independent of which event was fetched.
async function handler(): Promise<Omit<CheckoutEvent, 'locality'>> {
	try {
		const { tt_event_id: ticketTailorEventId, tt_bypass_id: bypassTicketTypeId } = await getCongressConfig();

		if (!ticketTailorEventId) {
			throw createError({ statusCode: 500, statusMessage: 'Ticket Tailor event id not configured' });
		}

		const ttEvent = await ticketTailorFetch<TTEvent>(`/events/${ticketTailorEventId}`, 'eventRead');
		const enrichmentById = await fetchTicketEnrichment(ttEvent.ticket_types.map((ticketType) => ticketType.id));

		return normalizeCheckoutEvent(ttEvent, enrichmentById, bypassTicketTypeId);
	} catch (error: any) {
		// Nothing in this chain (getCongressConfig, ticketTailorFetch,
		// fetchTicketEnrichment) logged anything of its own on failure — every
		// prior 500 here left zero trace of which step actually failed or why.
		// Logged in full now; still a 500 either way (createError above vs.
		// Directus/Ticket Tailor errors bubbling up).
		console.error('[checkout/event] Failed to build checkout event:', error?.data ?? error);
		throw error;
	}
}

// Deliberately no cookie/event-derived logic inside this cached handler —
// defineCachedEventHandler doesn't reliably forward the original request's
// cookies into its own inner handler invocation (confirmed empirically,
// back when this was still split per locality).
const cachedHandler = config.public.isSandbox
	? eventHandler(handler)
	: defineCachedEventHandler(handler, {
		maxAge: 60,
		getKey: () => 'checkout-event',
	});

export default defineEventHandler(async (event: H3Event) => {
	// This response varies per-user (membership, locality override) — never
	// let the browser cache it itself. The server-side cache above is a
	// separate mechanism and is unaffected by this.
	setResponseHeader(event, 'Cache-Control', 'no-store');

	// ?locality= comes from the client's persisted localityOverride (see
	// useCheckoutBasketStore) — only affects currency display now, not which
	// event gets fetched.
	const localityOverride = getQuery(event).locality;
	const locality = resolveCheckoutLocality(event, typeof localityOverride === 'string' ? localityOverride : null);

	const checkoutEvent = await cachedHandler(event);

	// The `member` flag comes from the client's already-known auth-store state
	// (see useCheckoutEvent.ts) rather than a fresh server-side Directus
	// lookup — this only controls what the UI shows as orderable, so it isn't
	// a security boundary. bundle.post.ts re-verifies real membership itself
	// before a bundle (and therefore a purchase) can actually be created.
	const isMember = getQuery(event).member === '1';

	return applyMembership({ ...checkoutEvent, locality }, isMember);
});
