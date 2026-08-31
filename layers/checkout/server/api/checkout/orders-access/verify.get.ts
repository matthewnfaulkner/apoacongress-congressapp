import type { H3Event } from 'h3';
import { randomBytes } from 'crypto';

// A few hours — long enough to browse/add to an order in one sitting, short
// enough that a shared/public device isn't left "logged in" for long.
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

/**
 * Guest "log in with email" step two — what the emailed magic link points
 * to. Verifies the access token minted by orders-access/request.post.ts
 * (unexpired, unused), marks it used, then creates a congress_order_sessions
 * row and hands the browser an httpOnly cookie referencing it (see
 * getCheckoutEmailSession in checkout-auth.ts) — not localStorage, since
 * this is a real recurring identity rather than a one-time checkout
 * artifact, and httpOnly keeps it out of reach of any XSS bug.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const query = getQuery(event);
	const token = typeof query.token === 'string' ? query.token : null;

	if (!token) {
		throw createError({ statusCode: 400, statusMessage: 'token is required' });
	}

	const rows = await directusServer.request<Array<{ id: string; email: string; expires_at: string; used_at: string | null }>>(
		withToken(
			config.directusOrderBotToken as string,
			readItems('congress_order_access_tokens' as any, {
				filter: { token: { _eq: token } } as any,
				fields: ['id', 'email', 'expires_at', 'used_at'],
				limit: 1,
			}),
		),
	);

	const accessToken = rows[0];

	if (!accessToken || accessToken.used_at || new Date(accessToken.expires_at).getTime() < Date.now()) {
		throw createError({ statusCode: 400, statusMessage: 'This link is invalid or has expired — request a new one.' });
	}

	// Single-use: marked used before the session is even created, so a
	// double-fired request (e.g. an email client pre-fetching the link)
	// can't mint two sessions off the same link.
	await directusServer.request(
		withToken(
			config.directusOrderBotToken as string,
			updateItem('congress_order_access_tokens' as any, accessToken.id, { used_at: new Date().toISOString() }),
		),
	);

	const sessionToken = randomBytes(24).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

	await directusServer.request(
		withToken(
			config.directusOrderBotToken as string,
			createItem('congress_order_sessions' as any, {
				email: accessToken.email,
				token: sessionToken,
				expires_at: expiresAt.toISOString(),
			}),
		),
	);

	setCookie(event, CHECKOUT_EMAIL_SESSION_COOKIE, sessionToken, {
		httpOnly: true,
		// Keyed off the site's actual protocol, not isSandbox (an auth-mode
		// flag, not a "are we serving over HTTPS" one) — getting this wrong
		// silently breaks the cookie: browsers accept a Secure-flagged cookie
		// being set but then refuse to ever send it back over plain HTTP,
		// which looks exactly like "the cookie exists but nothing reads it".
		secure: (config.public.siteUrl as string).startsWith('https://'),
		sameSite: 'lax',
		path: '/',
		expires: expiresAt,
	});

	return sendRedirect(event, '/checkout/my-orders', 302);
});
