import { readUsers, withToken } from '@directus/sdk';

export default defineEventHandler(async (event) => {
	const { email } = getQuery(event);

	if (!email || typeof email !== 'string') {
		throw createError({ statusCode: 400, message: 'Email required' });
	}

	const { directusServerToken } = useRuntimeConfig(event);

	try {
		const users = await directusServer.request(
			withToken(directusServerToken as string, readUsers({
				filter: { email: { _eq: email } },
				fields: ['provider'],
				limit: 1,
			}))
		);

		if (!users || users.length === 0) {
			return { provider: 'local' };
		}

		return { provider: users[0].provider || 'local' };
	} catch {
		return { provider: 'local' };
	}
});
