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

/**
 * Whether `orderId` refers to a `congress_orders` row the logged-in customer
 * owns — same check as order.get.ts's GET /api/checkout/order, but treats
 * "not logged in" as definitively not verified (unlike that route's
 * `!userToken => valid: true` behavior, which only ever gated a UI hint).
 * This gates whether bundle.post.ts trusts a registration-less basket as a
 * legitimate add-on, so an unauthenticated request must not pass here.
 */
export async function verifyOrderOwnership(event: H3Event, orderId: string): Promise<boolean> {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName] ?? null;

	if (!sessionToken) return false;

	try {
		// `congress_orders` doesn't exist in the generated schema yet — cast until
		// it's created in Directus and `npm run generate:types` picks it up.
		await directusServer.request(withToken(sessionToken, readItem('congress_orders' as any, orderId, { fields: ['id'] })));
		return true;
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
