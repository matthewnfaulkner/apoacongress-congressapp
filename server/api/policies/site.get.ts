import type { Policy } from '#shared/types/schema';
import { directusServer, readItem } from '../../utils/directus-server';

export default defineEventHandler(async () => {
	const config = useRuntimeConfig();

	try {
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
									'required',
									'default',
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

		return sitePolicies
			.filter((sp) => sp.policy?.id)
			.map((sp) => ({
				sitePolicyId: sp.id,
				policy: sp.policy as Policy,
			}));
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch site policies' });
	}
});
