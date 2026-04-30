export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const cookies = parseCookies(event);

	// DEBUG: log everything Directus sends on redirect — remove after confirming
	console.log('AUTH CALLBACK query:', JSON.stringify(query));
	console.log('AUTH CALLBACK cookies:', JSON.stringify(Object.keys(cookies)));

	return { query, cookieKeys: Object.keys(cookies) };
});
