import { verifyExchangeToken } from '../../utils/auth-exchange';

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const { token } = await readBody(event);

	if (!token || !config.authExchangeSecret) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request' });
	}

	try {
		const tokens = verifyExchangeToken(token, config.authExchangeSecret);
		return tokens;
	} catch {
		throw createError({ statusCode: 401, statusMessage: 'Invalid or expired exchange token' });
	}
});
