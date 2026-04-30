import { createExchangeToken } from '../../utils/auth-exchange';

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	if (!config.authExchangeSecret) {
		throw createError({ statusCode: 500, statusMessage: 'AUTH_EXCHANGE_SECRET not configured' });
	}

	const cookies = parseCookies(event);
	const refreshToken = cookies[config.refreshTokenName];

	if (!refreshToken) {
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
		console.log(e);
		return sendRedirect(event, `${config.public.siteUrl}/login`);
	}
});
