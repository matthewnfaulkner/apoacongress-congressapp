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
				{ policy: ['id', 'name', 'type', 'notification', 'content', 'date_updated'] },
			],
		}],
	} as any;

	const site = await directusServer.request(
		sessionToken
			? withToken(sessionToken, readItem('sites', config.public.siteId, params))
			: readItem('sites', config.public.siteId, params),
	);

	const sitePolicies = ((site as any).user_policies || []) as Array<{ id: number; policy: Policy }>;

	const match = sitePolicies.find((sp) => (sp.policy as Policy)?.type === 'privacy');

	if (!match?.policy) {
		throw createError({ statusCode: 404, statusMessage: 'Privacy policy not found' });
	}

	return { policy: match.policy as Policy };
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: () => 'policies-privacy',
		shouldBypassCache: () => true,
	});
