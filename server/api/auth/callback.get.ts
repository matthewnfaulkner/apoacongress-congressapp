import { createExchangeToken } from '../../utils/auth-exchange';

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	if (!config.authExchangeSecret) {
		throw createError({ statusCode: 500, statusMessage: 'AUTH_EXCHANGE_SECRET not configured' });
	}

	// Directus is on a different domain so its cookie won't cross to this domain.
	// Read the refresh token from the query string instead (passed by Directus in the redirect URL).
	const query = getQuery(event);
	const refreshToken = query.token as string | undefined
		?? query.refresh_token as string | undefined
		?? parseCookies(event)[config.refreshTokenName];

	if (!refreshToken) {
		return { query: Object.keys(query), cookieHeader: getHeader(event, 'cookie') };
	}

	try {
		const response = await $fetch<{
			data: { access_token: string; refresh_token: string; expires: number };
		}>(`${config.public.directusUrl}/auth/refresh`, {
			method: 'POST',
			body: { mode: 'json', refresh_token: refreshToken },
		});

		const exchangeToken = createExchangeToken(response.data, config.authExchangeSecret);

		return sendRedirect(
			event,
			`${config.public.siteUrl}/login?k=${encodeURIComponent(exchangeToken)}`,
		);
	} catch (e){
		console.log('AUTH CALLBACK exchange failed:', e);
		return sendRedirect(event, `${config.public.siteUrl}/login`);
	}
});
