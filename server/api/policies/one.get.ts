import type { Policy } from '#shared/types/schema';
import { directusServer, readItem, withToken } from '../../utils/directus-server';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

/**
 * A single policy for the current site, looked up either by its `key`
 * (policies/[...key].vue's own page) or its `id` (PolicyField.vue resolving
 * the notification text/link for whatever policy a form_fields.policy
 * relation points at — that relation only ever carries a bare id, not the
 * full policy). Same site-scoped pattern as privacy.get.ts/site.get.ts: read
 * the one `sites` row for config.public.siteId and pull its related
 * policies, rather than filtering the policies collection directly.
 */
async function handler(event: H3Event) {
	const query = getQuery(event);
	const key = typeof query.key === 'string' ? query.key : null;
	const id = typeof query.id === 'string' ? query.id : null;

	if (!key && !id) {
		throw createError({ statusCode: 400, statusMessage: 'key or id is required' });
	}

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const params = {
		fields: [{
			user_policies: [
				'id',
				{ policy: ['id', 'key', 'name', 'type', 'notification', 'content', 'date_updated'] },
			],
		}],
	} as any;

	const site = await directusServer.request(
		sessionToken
			? withToken(sessionToken, readItem('sites', config.public.siteId, params))
			: readItem('sites', config.public.siteId, params),
	);

	const sitePolicies = ((site as any).user_policies || []) as Array<{ id: number; policy: Policy }>;

	const match = key
		? sitePolicies.find((sp) => (sp.policy as Policy)?.key === key)
		: sitePolicies.find((sp) => (sp.policy as Policy)?.id === id);

	if (!match?.policy) {
		throw createError({ statusCode: 404, statusMessage: 'Policy not found' });
	}

	return { policy: match.policy as Policy };
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `policies-one-${JSON.stringify(getQuery(event))}`,
	});
