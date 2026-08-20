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
