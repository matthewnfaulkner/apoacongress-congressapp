import type { H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
	const query = getQuery(event);
	const usd = Number(query.usd);

	if (!usd || usd <= 0) {
		throw createError({ statusCode: 400, statusMessage: 'usd must be a positive number' });
	}

	const rate = await getLiveUsdToTwdRate();

	return {
		usd,
		rate,
		twd: Math.round(usd * rate),
	};
});
