import type { H3Event } from 'h3';
import { randomBytes } from 'crypto';

/**
 * Guest "log in with email" step one: mints a short-lived, single-use access
 * token and stores it (see orders-access/verify.get.ts for step two, which
 * the emailed link points to). Actually sending the email is deliberately
 * not done here — a Directus Flow with an event-hook trigger on
 * congress_order_access_tokens' create action handles that instead, so
 * email delivery/templating lives in Directus, not app code.
 *
 * Always returns the same generic response regardless of whether the email
 * matched anything real — a different response here would let this be used
 * to check which emails have ever placed an order.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const body = await readBody<{ email?: string; congress?: string }>(event);
	const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
	// The checkout page already knows which congress it's for — passed
	// straight through rather than looked up again here — so the Flow that
	// sends the email (triggered on this create) can pull in congress-
	// specific details (title, dates, etc.) via that relation.
	const congress = typeof body?.congress === 'string' ? body.congress : null;

	const genericResponse = { success: true };

	if (!email || !email.includes('@')) {
		return genericResponse;
	}

	const token = randomBytes(24).toString('hex');
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

	try {
		await directusServer.request(
			withToken(
				config.directusOrderBotToken as string,
				createItem('congress_order_access_tokens' as any, { email, token, expires_at: expiresAt, congress }),
			),
		);
	} catch (error: any) {
		// ofetch's FetchError nests the actual Directus validation detail under
		// error.data, which the default error toString/stack doesn't surface.
		console.error('[orders-access/request] Could not create access token:', JSON.stringify(error?.data ?? error));
	}

	return genericResponse;
});
