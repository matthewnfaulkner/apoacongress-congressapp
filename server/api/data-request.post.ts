export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	const flowId = config.dataRequestFlowId as string;

	if (!flowId) {
		throw createError({ statusCode: 500, statusMessage: 'DIRECTUS_DATA_REQUEST_FLOW_ID is not defined.' });
	}

	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName as string] ?? null;

	if (!sessionToken) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });
	}

	let me: { id: string; email: string | null; first_name: string | null; last_name: string | null };
	try {
		me = await directusServer.request(
			withToken(sessionToken, readMe({ fields: ['id', 'email', 'first_name', 'last_name'] })),
		) as typeof me;
	} catch {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized.' });
	}

	try {
		await $fetch(`${config.public.directusUrl}/flows/trigger/${flowId}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${config.directusServerToken}` },
			body: {
				user_id: me.id,
				email: me.email,
				first_name: me.first_name,
				last_name: me.last_name,
			},
		});
	} catch (e) {
		console.error('Failed to trigger data request flow:', e);
		throw createError({ statusCode: 502, statusMessage: 'Failed to submit data request.' });
	}

	return { success: true };
});
