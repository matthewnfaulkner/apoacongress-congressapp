import type { H3Event } from 'h3';

/**
 * Whether the caller may add tickets to `registrationId` ("Add tickets" on
 * My registration), and whose registration it is for the checkout banner.
 * Display only — bundle.post.ts re-checks before creating anything.
 */
export default defineEventHandler(async (event: H3Event) => {
	const registrationId = getQuery(event).registrationId;

	if (typeof registrationId !== 'string' || !registrationId) {
		throw createError({ statusCode: 400, statusMessage: 'registrationId is required' });
	}

	const registration = await findAddOnRegistration(event, registrationId);
	return registration ? { valid: true, label: registration.label } : { valid: false, label: null };
});
