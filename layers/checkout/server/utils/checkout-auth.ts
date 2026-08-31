import type { H3Event } from 'h3';
import type { DirectusUser } from '#shared/types/schema';

/**
 * The logged-in user's id, if any — checked via bearer token first (how the
 * client authenticates in production's json auth mode; see app/plugins/
 * directus.ts) and falling back to the sandbox session cookie. A plain
 * cookie-only check (like getCheckoutMembership below) misses every
 * production request, since a JS fetch call there carries its token as an
 * Authorization header, not a cookie.
 */
export async function getCheckoutUserId(event: H3Event): Promise<string | null> {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName] ?? null;

	if (!sessionToken) return null;

	try {
		const user = await directusServer.request<Pick<DirectusUser, 'id'>>(withToken(sessionToken, readMe({ fields: ['id'] })));
		return user.id;
	} catch {
		return null;
	}
}

/**
 * The logged-in user's contact details, if any — used to prefill Ticket
 * Tailor's embedded checkout widget (see bundle.post.ts / CheckoutEmbed.vue)
 * so a returning customer doesn't have to retype their name and email on
 * Ticket Tailor's own hosted checkout form.
 */
export async function getCheckoutContactDetails(event: H3Event): Promise<{ firstName: string; lastName: string; email: string } | null> {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName] ?? null;

	if (!sessionToken) return null;

	try {
		const user = await directusServer.request<Pick<DirectusUser, 'first_name' | 'last_name' | 'email'>>(
			withToken(sessionToken, readMe({ fields: ['first_name', 'last_name', 'email'] })),
		);

		if (!user.email) return null;

		return { firstName: user.first_name ?? '', lastName: user.last_name ?? '', email: user.email };
	} catch {
		return null;
	}
}

// Deliberately distinct from config.sessionTokenName — this is not a real
// Directus session, just a cookie referencing a congress_order_sessions row
// (see orders-access/verify.get.ts).
export const CHECKOUT_EMAIL_SESSION_COOKIE = 'checkout_email_session';

/**
 * The email address a guest verified via magic link, if the session cookie
 * still references a live, unexpired congress_order_sessions row — see
 * orders-access/request.post.ts and orders-access/verify.get.ts. Read via
 * the bot token, same as the rest of the checkout layer's own collections:
 * there's no Directus user account behind this at all, so there's no session
 * token of the customer's own to check permissions with.
 */
export async function getCheckoutEmailSession(event: H3Event): Promise<string | null> {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const sessionToken = cookies[CHECKOUT_EMAIL_SESSION_COOKIE];

	if (!sessionToken) return null;

	try {
		const rows = await directusServer.request<Array<{ email: string; expires_at: string }>>(
			withToken(
				config.directusOrderBotToken as string,
				readItems('congress_order_sessions' as any, {
					filter: { token: { _eq: sessionToken } } as any,
					fields: ['email', 'expires_at'],
					limit: 1,
				}),
			),
		);

		const session = rows[0];
		if (!session || parseDirectusTimestamp(session.expires_at) < Date.now()) return null;

		return session.email;
	} catch {
		return null;
	}
}

// A Directus "Timestamp" field returns an ISO string with a timezone (e.g.
// "...Z"), which `new Date()` parses correctly as-is. A "DateTime" field
// (timezone-naive by design) returns one without — e.g. "2026-08-21T09:42:29"
// — and `new Date()` on that parses it as *local server time*, not UTC,
// silently producing a wrong comparison depending on the server's timezone.
// This coerces either shape to a real UTC instant instead of assuming the
// field was configured as the timezone-aware type.
function parseDirectusTimestamp(value: string): number {
	const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
	return new Date(hasTimezone ? value : `${value}Z`).getTime();
}

/**
 * Whether `orderId` refers to a `congress_orders` row the current customer
 * owns — same check as order.get.ts's GET /api/checkout/order, but treats
 * "not logged in" as definitively not verified (unlike that route's
 * `!userToken => valid: true` behavior, which only ever gated a UI hint).
 * This gates whether bundle.post.ts trusts a registration-less basket as a
 * legitimate add-on, so an unauthenticated request must not pass here.
 *
 * A verified guest email session (see getCheckoutEmailSession) counts too —
 * a guest who logged in with their email should be able to add to their own
 * order the same way a real account or the checkout-time guest token can.
 */
export async function verifyOrderOwnership(event: H3Event, orderId: string): Promise<boolean> {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName] ?? null;

	if (sessionToken) {
		try {
			// `congress_orders` doesn't exist in the generated schema yet — cast until
			// it's created in Directus and `npm run generate:types` picks it up.
			await directusServer.request(withToken(sessionToken, readItem('congress_orders' as any, orderId, { fields: ['id'] })));
			return true;
		} catch {
			// Not this session's order — an email session (if any) still gets a
			// shot below.
		}
	}

	const email = await getCheckoutEmailSession(event);
	if (!email) return false;

	try {
		const row = await directusServer.request<{ email: string | null }>(
			withToken(config.directusOrderBotToken as string, readItem('congress_orders' as any, orderId, { fields: ['email'] })),
		);
		return row.email === email;
	} catch {
		return false;
	}
}

/**
 * "Member" here means the Directus user either has a membership_number set or
 * an active subscription (`has_subscription`) — the same two fields used
 * elsewhere in the app (see profile.vue). congress_charges.members_only (see
 * congress-ticket-enrichment.ts) is gated on this, not on any Ticket
 * Tailor-side membership feature — their own members_only ticket status
 * isn't used, since it surfaces a confusing "enter membership code" prompt
 * that doesn't apply here.
 */
export async function getCheckoutMembership(event: H3Event): Promise<boolean> {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	if (!sessionToken) return false;

	try {
		const user = await directusServer.request<DirectusUser & { has_subscription?: boolean | null }>(
			withToken(sessionToken, readMe({ fields: ['membership_number', 'has_subscription'] } as any)),
		);
		return Boolean(user.membership_number) || Boolean(user.has_subscription);
	} catch {
		return false;
	}
}
