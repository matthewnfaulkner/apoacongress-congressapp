import type { H3Event } from 'h3'

export type CheckoutLocality = 'national' | 'international'

const NATIONAL_COUNTRY = 'TW'

/**
 * `override` is whatever the client explicitly sent (from the persisted
 * localityOverride in the checkout basket store — see
 * useCheckoutBasketStore) and always wins when present. Otherwise falls back
 * to the IP-detected country — geo-IP is wrong often enough (VPNs,
 * travelers, corporate networks) that customers need a way to correct it
 * themselves for something that affects real pricing/payment routing.
 */
export function resolveCheckoutLocality(event: H3Event, override?: string | null): CheckoutLocality {
	if (override === 'national' || override === 'international') return override

	return getRequestCountry(event) === NATIONAL_COUNTRY ? 'national' : 'international'
}

// One Ticket Tailor event now (see congress.tt_event_id, via
// getCongressEventId) rather than a separate national/international event
// picked by locality — the old TICKET_TAILOR_EVENT_ID / _INTL env vars this
// replaced only ever had one working event behind them anyway.
export async function resolveCheckoutEventId(): Promise<string> {
	const eventId = await getCongressEventId()

	if (!eventId) {
		throw createError({ statusCode: 500, statusMessage: 'Ticket Tailor event id not configured' })
	}

	return eventId
}
