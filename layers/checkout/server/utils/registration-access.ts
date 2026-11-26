import type { H3Event } from 'h3';

/**
 * Whether buyers and attendees may still change who a place is for, which
 * add-on belongs to whom, etc. After the cutoff only staff can (through the
 * admin app, not this site).
 *
 * How the cutoff is configured isn't decided yet, so this is the one place
 * to wire it in later — every assignment write route must call it.
 */
export function canChangeAssignments(_congressId: string): boolean {
	return true;
}

/** Case-insensitive email comparison; empty never matches. */
export function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
	if (!a || !b) return false;
	return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** The sync flow's flag for a paid place nobody has been named for yet. */
export const REVIEW_REASON_DETAILS_MISSING = 'Attendee details missing';
/** Prefix of the duplicate-email review reason this app writes. */
export const REVIEW_REASON_SAME_EMAIL_PREFIX = 'Same email as ';

export type OrderAdmission = {
	kind: 'delegate' | 'accompanying';
	status: 'pending' | 'confirmed' | 'cancelled';
};

/**
 * Every place (registration) this order's admission tickets created, keyed
 * by registration id. "Belongs to this order" in the save routes means
 * "is in this map": a registration's admission ticket has order = this
 * order. Voided tickets don't count.
 */
export async function loadOrderAdmissions(orderId: string): Promise<Map<string, OrderAdmission>> {
	const config = useRuntimeConfig();

	const rows = await directusServer.request<Array<{
		status: 'valid' | 'voided' | null;
		ticket_type: { charge: { registration_type: OrderAdmission['kind'] | null } | null } | null;
		registration: { id: string; status: OrderAdmission['status'] } | null;
	}>>(
		withToken(
			config.directusOrderBotToken as string,
			readItems('congress_issued_tickets', {
				filter: { order: { _eq: orderId }, registration: { _nnull: true } },
				fields: ['status', { ticket_type: [{ charge: ['registration_type'] }] }, { registration: ['id', 'status'] }],
				limit: -1,
			} as any),
		),
	);

	const admissions = new Map<string, OrderAdmission>();
	for (const row of rows) {
		const kind = row.ticket_type?.charge?.registration_type;
		if (row.status === 'voided' || !kind || !row.registration) continue;
		admissions.set(row.registration.id, { kind, status: row.registration.status });
	}
	return admissions;
}

/** 403 if the assignment cutoff has passed. */
export function requireAssignmentsOpen(congressId: string): void {
	if (!canChangeAssignments(congressId)) {
		throw createError({ statusCode: 403, statusMessage: 'Changes to ticket assignments are closed. Please contact us for help.' });
	}
}

export type CallerIdentity = {
	/** Logged-in Directus account, if any. */
	userId: string | null;
	/** Email verified through the login link, if any. */
	email: string | null;
};

/**
 * Who is calling, by either route: their account and/or their verified
 * email-login session. Both can be present at once; both count.
 */
export async function getCallerIdentity(event: H3Event): Promise<CallerIdentity> {
	const [userId, email] = await Promise.all([getCheckoutUserId(event), getCheckoutEmailSession(event)]);
	return { userId, email };
}

/** 401 unless the caller is logged in or has a verified email session. */
export async function requireCallerIdentity(event: H3Event): Promise<CallerIdentity> {
	const identity = await getCallerIdentity(event);
	if (!identity.userId && !identity.email) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
	}
	return identity;
}

/**
 * Attendee match for a registration: its `user` is the logged-in account,
 * or its `email` is the verified login-link email.
 */
export function isAttendee(identity: CallerIdentity, registration: { user: string | null; email: string | null }): boolean {
	if (identity.userId && registration.user === identity.userId) return true;
	return sameEmail(identity.email, registration.email);
}

/**
 * Directus filter for "registrations that might be the caller's" on this
 * site. Email can only be narrowed with _icontains (no case-insensitive
 * equals), so results must still be checked with isAttendee.
 */
export function attendeeRegistrationsFilter(identity: CallerIdentity): Record<string, unknown> {
	const config = useRuntimeConfig();
	const matches: Record<string, unknown>[] = [];
	if (identity.userId) matches.push({ user: { _eq: identity.userId } });
	if (identity.email) matches.push({ email: { _icontains: identity.email } });

	return {
		congress: { site: { _eq: config.public.siteId } },
		_or: matches,
	};
}

/**
 * "Add tickets" (add-ons / a companion) for an existing registration: allowed
 * if the caller is its attendee, or the buyer of the order its admission
 * ticket came from, and it's confirmed. Works for comp and imported
 * registrations too — they have no order, so only their attendee qualifies.
 *
 * Returns the registration's id and a display name, or null if not allowed.
 */
export async function findAddOnRegistration(event: H3Event, registrationId: string): Promise<{ id: string; label: string } | null> {
	const config = useRuntimeConfig();
	const identity = await getCallerIdentity(event);
	if (!identity.userId && !identity.email) return null;

	let registration: {
		id: string;
		status: string;
		user: string | null;
		email: string | null;
		first_name: string | null;
		last_name: string | null;
		congress: { site: string | null } | null;
		tickets: Array<{ status: string | null; order: { user: string | null; email: string | null } | null }> | null;
	};
	try {
		registration = await directusServer.request<typeof registration>(
			withToken(
				config.directusOrderBotToken as string,
				readItem('congress_registrations', registrationId, {
					fields: [
						'id', 'status', 'user', 'email', 'first_name', 'last_name',
						{ congress: ['site'] },
						{ tickets: ['status', { order: ['user', 'email'] }] },
					],
				} as any),
			),
		);
	} catch {
		return null;
	}

	if (!registration || registration.status !== 'confirmed' || registration.congress?.site !== config.public.siteId) return null;

	const isBuyer = (registration.tickets ?? []).some((ticket) =>
		ticket.status !== 'voided' && ticket.order && (
			(identity.userId !== null && ticket.order.user === identity.userId) || sameEmail(identity.email, ticket.order.email)
		),
	);

	if (!isAttendee(identity, registration) && !isBuyer) return null;

	const label = [registration.first_name, registration.last_name].filter(Boolean).join(' ') || 'this registration';
	return { id: registration.id, label };
}

export type BuyerOrder = {
	id: string;
	congress: string;
};

/**
 * Proves the caller is the buyer of `orderId`, or throws 404 (same response
 * as an order that doesn't exist, so this can't be used to probe order ids).
 *
 * The buyer is either:
 *  - the logged-in account set as `congress_orders.user`, or
 *  - whoever holds a verified email-login session (getCheckoutEmailSession)
 *    for the address in `congress_orders.email`.
 *
 * Deliberately explicit rather than "can the caller's own token read this
 * row" like order/[id].get.ts: routes that call this go on to write with
 * the order bot token, which ignores row permissions, so this check is the
 * only gate there is.
 *
 * The order's congress must also belong to this site (one congress per site).
 */
export async function requireBuyerOfOrder(event: H3Event, orderId: string): Promise<BuyerOrder> {
	const config = useRuntimeConfig();
	const notFound = () => createError({ statusCode: 404, statusMessage: 'Order not found' });

	let order: { id: string; user: string | null; email: string | null; congress: { id: string; site: string | null } | null };
	try {
		order = await directusServer.request<typeof order>(
			withToken(
				config.directusOrderBotToken as string,
				readItem('congress_orders', orderId, { fields: ['id', 'user', 'email', { congress: ['id', 'site'] }] } as any),
			),
		);
	} catch {
		throw notFound();
	}

	if (!order?.congress || order.congress.site !== config.public.siteId) throw notFound();

	const buyer: BuyerOrder = { id: order.id, congress: order.congress.id };

	const userId = await getCheckoutUserId(event);
	if (userId && order.user === userId) return buyer;

	const sessionEmail = await getCheckoutEmailSession(event);
	if (sameEmail(sessionEmail, order.email)) return buyer;

	throw notFound();
}
