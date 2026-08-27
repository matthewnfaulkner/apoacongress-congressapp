import { createExchangeToken } from '../../utils/auth-exchange';
import { isSafeRedirect } from '~~/shared/utils/redirect';

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

	// Carried through from the original /login?redirect=... so login.vue can
	// still send the user on to where they were headed once this SSO
	// round-trip finishes, instead of always landing back on the homepage.
	// Only a same-origin relative path is trusted - see isSafeRedirect.
	const redirectTarget = isSafeRedirect(query.redirect) ? query.redirect : null;

	function loginRedirectUrl(exchangeToken?: string) {
		const params = new URLSearchParams();
		if (exchangeToken) params.set('k', exchangeToken);
		if (redirectTarget) params.set('redirect', redirectTarget);
		const qs = params.toString();
		return `${config.public.siteUrl}/login${qs ? `?${qs}` : ''}`;
	}

	try {
		const response = await $fetch<{
			data: { access_token: string; refresh_token: string; expires: number };
		}>(`${config.public.directusUrl}/auth/refresh`, {
			method: 'POST',
			body: { mode: 'json', refresh_token: refreshToken },
		});

		const exchangeToken = createExchangeToken(response.data, config.authExchangeSecret);

		return sendRedirect(event, loginRedirectUrl(exchangeToken));
	} catch (e){
		console.log('AUTH CALLBACK exchange failed:', e);
		return sendRedirect(event, loginRedirectUrl());
	}
});
