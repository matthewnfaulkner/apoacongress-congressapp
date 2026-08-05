import type { Policy } from '#shared/types/schema';
import { directusServer, readItem, withToken } from '../../utils/directus-server';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const params = {
		fields: [{
			user_policies: [
				'id',
				{ policy: ['id', 'name', 'type', 'notification', 'content', 'date_updated', 'required', 'default'] },
			],
		}],
	} as any;

	try {
		const site = await directusServer.request(
			sessionToken
				? withToken(sessionToken, readItem('sites', config.public.siteId, params))
				: readItem('sites', config.public.siteId, params),
		);

		const sitePolicies = ((site as any).user_policies || []) as Array<{ id: number; policy: Policy }>;

		return sitePolicies
			.filter((sp) => sp.policy?.id)
			.map((sp) => ({ sitePolicyId: sp.id, policy: sp.policy as Policy }));
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch site policies' });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: () => 'policies-site',
		shouldBypassCache: () => true,
	});
