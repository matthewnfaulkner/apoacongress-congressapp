import type { H3Event } from 'h3';
import type { PersonInput } from '../../../../../utils/registration-person';

/**
 * The buyer names who a place in their order is for (Manage tickets page).
 * Writes our Directus registration only — Ticket Tailor's ticket holder is
 * left as it is. The save rules live in savePerson (registration-person.ts).
 *
 * Gate (the bot token ignores row permissions, so this is the only one):
 * caller is the order's buyer, assignments are still open, the registration
 * is one of this order's places, and it isn't cancelled.
 *
 * Once the email is set, a Directus flow notifies the person — this route
 * sends nothing itself.
 */
export default defineEventHandler(async (event: H3Event) => {
	const orderId = getRouterParam(event, 'id');
	const registrationId = getRouterParam(event, 'registrationId');

	if (!orderId || !registrationId) {
		throw createError({ statusCode: 400, statusMessage: 'orderId and registrationId are required' });
	}

	const order = await requireBuyerOfOrder(event, orderId);
	requireAssignmentsOpen(order.congress);

	const admissions = await loadOrderAdmissions(order.id);
	const place = admissions.get(registrationId);

	// Same 404 as a non-existent id: a registration outside this order is
	// none of this buyer's business, including whether it exists.
	if (!place) {
		throw createError({ statusCode: 404, statusMessage: 'Place not found in this order' });
	}
	if (place.status === 'cancelled') {
		throw createError({ statusCode: 409, statusMessage: 'This place has been cancelled and can no longer be changed.' });
	}

	const body = (await readBody<PersonInput & { host_registration?: unknown }>(event)) ?? ({} as PersonInput);
	const next = validatePerson(place.kind, body);

	// Companions must say which delegate in this same order they come with.
	const extra: Record<string, unknown> = {};
	if (place.kind === 'accompanying') {
		const hostRegistration = cleanText(body.host_registration);
		const host = hostRegistration ? admissions.get(hostRegistration) : undefined;
		if (!hostRegistration || hostRegistration === registrationId || !host || host.kind !== 'delegate' || host.status === 'cancelled') {
			throw createError({ statusCode: 400, statusMessage: 'Choose which delegate in this order they are accompanying.' });
		}
		extra.host_registration = hostRegistration;
	}

	await savePerson(order.congress, registrationId, next, extra);

	return { success: true };
});
