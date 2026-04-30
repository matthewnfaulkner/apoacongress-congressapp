import { createExchangeToken } from '../../utils/auth-exchange';

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	if (!config.authExchangeSecret) {
		throw createError({ statusCode: 500, statusMessage: 'AUTH_EXCHANGE_SECRET not configured' });
	}

	const cookies = parseCookies(event);
	const refreshToken = cookies[config.refreshTokenName];

	console.log('AUTH CALLBACK refreshTokenName:', config.refreshTokenName);
	console.log('AUTH CALLBACK refreshToken present:', !!refreshToken);

	if (!refreshToken) {
		return { cookieKeys: Object.keys(cookies) };
		return sendRedirect(event, config.public.loginUrl);
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
