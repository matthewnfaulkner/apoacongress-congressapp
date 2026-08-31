const TICKET_TAILOR_BASE_URL = 'https://api.tickettailor.com/v1';

// Ticket Tailor's docs render client-side and couldn't be scraped for the exact
// checkout-URL query param — confirm this against a real bundle before relying on it.
export const TICKET_TAILOR_ACCESS_CODE_PARAM = 'a';

// Capability-scoped keys — every call site says what it's actually doing, and
// gets only the narrowest key that covers it, rather than one all-access key
// used everywhere.
export type TicketTailorCapability = 'eventRead' | 'orderRead' | 'bundleCreate';

const CAPABILITY_CONFIG_KEY: Record<TicketTailorCapability, 'ticketTailorEventReadKey' | 'ticketTailorOrderReadKey' | 'ticketTailorBundleCreateKey'> = {
	eventRead: 'ticketTailorEventReadKey',
	orderRead: 'ticketTailorOrderReadKey',
	bundleCreate: 'ticketTailorBundleCreateKey',
};

function basicAuthHeader(apiKey: string): string {
	return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

export function ticketTailorFetch<T>(
	path: string,
	capability: TicketTailorCapability,
	options: Parameters<typeof $fetch>[1] = {},
): Promise<T> {
	const config = useRuntimeConfig();
	const apiKey = config[CAPABILITY_CONFIG_KEY[capability]] as string | undefined;

	if (!apiKey) {
		throw createError({ statusCode: 500, statusMessage: `Ticket Tailor ${capability} API key not configured` });
	}

	return $fetch<T>(`${TICKET_TAILOR_BASE_URL}${path}`, {
		...options,
		headers: {
			...options.headers,
			Authorization: basicAuthHeader(apiKey),
		},
	});
}

// Module-scoped rather than a proper cache backend — the checkout layer has
// no existing storage/caching pattern to follow (see ticket-tailor-health),
// and this is only ever meant to keep a flaky/slow Ticket Tailor from being
// pinged on every single page render, not to survive a server restart.
let cachedHealth: { available: boolean; checkedAt: number } | null = null;
const HEALTH_CACHE_MS = 15_000;

/**
 * Pings Ticket Tailor's own uptime check rather than a real data endpoint —
 * cheap enough to call on every checkout page load (subject to the cache
 * above) without burning into any capability's real rate limit. Uses the
 * eventRead key purely because every checkout session needs that capability
 * anyway (see event.get.ts) — /ping doesn't care which key it gets, but this
 * both confirms connectivity and that the configured key itself still works.
 */
export async function checkTicketTailorHealth(): Promise<boolean> {
	if (cachedHealth && Date.now() - cachedHealth.checkedAt < HEALTH_CACHE_MS) {
		return cachedHealth.available;
	}

	let available: boolean;
	try {
		await ticketTailorFetch('/ping', 'eventRead', { timeout: 5000 });
		available = true;
	} catch {
		available = false;
	}

	cachedHealth = { available, checkedAt: Date.now() };
	return available;
}
