import type { Policy } from '#shared/types/schema';
import { directusServer, readItem } from '../../utils/directus-server';

export default defineEventHandler(async () => {
	const config = useRuntimeConfig();

	const site = await directusServer.request(
		readItem('sites', config.public.siteId, {
			fields: [
				{
					user_policies: [
						'id',
						{
							policy: [
								'id',
								'name',
								'type',
								'notification',
								'content',
								'date_updated',
							],
						},
					],
				},
			],
		}),
	);

	const sitePolicies = ((site as any).user_policies || []) as Array<{
		id: number;
		policy: Policy;
	}>;

	const match = sitePolicies.find(
		(sp) => (sp.policy as Policy)?.type === 'privacy',
	);

	if (!match?.policy) {
		throw createError({ statusCode: 404, statusMessage: 'Privacy policy not found' });
	}

	return { policy: match.policy as Policy };
});
