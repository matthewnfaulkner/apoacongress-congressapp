/**
 * Saving who a place is for (title, names, email, and for companions their
 * host) — shared by the buyer's Manage tickets route and the delegate's
 * "edit my companion" route on My registration, so both apply exactly the
 * same rules. Callers do their own access check first; this only writes.
 *
 * Rules (agreed with Matthew):
 *  - A different person (email changed; or, with no email, name changed)
 *    clears what the old person filled in for themselves.
 *  - Same email as another non-cancelled registration in the congress →
 *    flagged for staff, save still goes through.
 *  - The sync flow's "Attendee details missing" flag is cleared.
 */

export type PersonKind = 'delegate' | 'accompanying';

export type PersonInput = {
	title: unknown;
	first_name: unknown;
	last_name: unknown;
	email: unknown;
};

type RegistrationRow = {
	id: string;
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	review_reason: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed string, or null for anything empty / not a string. */
export function cleanText(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Validates the person fields; throws 400 with a readable message. */
export function validatePerson(kind: PersonKind, input: PersonInput) {
	const next = {
		title: cleanText(input.title),
		first_name: cleanText(input.first_name),
		last_name: cleanText(input.last_name),
		email: cleanText(input.email)?.toLowerCase() ?? null,
	};

	if (!next.first_name || !next.last_name) {
		throw createError({ statusCode: 400, statusMessage: 'First name and last name are required.' });
	}
	if (kind === 'delegate' && !next.email) {
		throw createError({ statusCode: 400, statusMessage: 'Email is required for delegates.' });
	}
	if (next.email && !EMAIL_PATTERN.test(next.email)) {
		throw createError({ statusCode: 400, statusMessage: 'That email address doesn\'t look right.' });
	}

	return next;
}

/**
 * Writes the person to the registration (bot token), applying the rules
 * above. `extra` is merged into the update (e.g. host_registration).
 */
export async function savePerson(
	congressId: string,
	registrationId: string,
	next: ReturnType<typeof validatePerson>,
	extra: Record<string, unknown> = {},
): Promise<void> {
	const config = useRuntimeConfig();
	const botToken = config.directusOrderBotToken as string;

	const current = await directusServer.request<RegistrationRow>(
		withToken(
			botToken,
			readItem('congress_registrations', registrationId, {
				fields: ['id', 'first_name', 'last_name', 'email', 'review_reason'],
			}),
		),
	);

	const update: Record<string, unknown> = { ...next, ...extra };

	// A different person: everything the old person filled in for themselves
	// (and their account link) goes. The form submission is only unlinked.
	if (isDifferentPerson(current, next)) {
		Object.assign(update, {
			user: null,
			badge_name: null,
			organisation_name: null,
			city: null,
			country: null,
			submission: null,
		});
	}

	Object.assign(update, await reviewUpdate(botToken, congressId, current, next.email));

	await directusServer.request(withToken(botToken, updateItem('congress_registrations', registrationId, update as any)));
}

/**
 * A place that had an email is a different person when the email changes;
 * one that only had a name (a companion without email) is a different
 * person when the name changes. Filling an empty place isn't a change, and
 * fixing a typo in a name that has an email keeps the details.
 */
function isDifferentPerson(
	current: Pick<RegistrationRow, 'first_name' | 'last_name' | 'email'>,
	next: { first_name: string | null; last_name: string | null; email: string | null },
): boolean {
	if (current.email) return !sameEmail(current.email, next.email);

	const currentName = normaliseName(current.first_name, current.last_name);
	if (!currentName) return false;
	return currentName !== normaliseName(next.first_name, next.last_name);
}

function normaliseName(first: string | null, last: string | null): string {
	return [first, last].map((part) => (part ?? '').trim().toLowerCase()).join(' ').trim();
}

/**
 * needs_review / review_reason changes for this save:
 *  - Another non-cancelled registration in the congress has the same email
 *    → flag "Same email as <name>". An existing reason that staff or another
 *    flow set is kept (only needs_review is set), so it isn't silently lost.
 *  - Otherwise, the sync flow's "Attendee details missing" flag is cleared.
 *  - Any other reason is left alone (including a stale "Same email as" —
 *    agreed to leave those for now).
 */
async function reviewUpdate(
	botToken: string,
	congressId: string,
	current: RegistrationRow,
	email: string | null,
): Promise<Record<string, unknown>> {
	if (email) {
		// Directus has no case-insensitive equals, so narrow with _icontains
		// and compare exactly here.
		const candidates = await directusServer.request<Array<{ first_name: string | null; last_name: string | null; email: string | null }>>(
			withToken(
				botToken,
				readItems('congress_registrations', {
					filter: {
						congress: { _eq: congressId },
						id: { _neq: current.id },
						status: { _neq: 'cancelled' },
						email: { _icontains: email },
					},
					fields: ['first_name', 'last_name', 'email'],
					limit: 50,
				} as any),
			),
		);

		const duplicate = candidates.find((row) => sameEmail(row.email, email));
		if (duplicate) {
			const name = [duplicate.first_name, duplicate.last_name].filter(Boolean).join(' ') || 'another registration';
			const reasonIsOurs = !current.review_reason
				|| current.review_reason === REVIEW_REASON_DETAILS_MISSING
				|| current.review_reason.startsWith(REVIEW_REASON_SAME_EMAIL_PREFIX);

			return reasonIsOurs
				? { needs_review: true, review_reason: `${REVIEW_REASON_SAME_EMAIL_PREFIX}${name}` }
				: { needs_review: true };
		}
	}

	if (current.review_reason === REVIEW_REASON_DETAILS_MISSING) {
		return { needs_review: false, review_reason: null };
	}

	return {};
}
