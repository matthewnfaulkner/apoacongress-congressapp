import type { Form } from '#shared/types/schema';

/**
 * The optional form (Directus sites.checkout_form) shown alongside the
 * basket on the checkout review page (see complete.vue) — e.g. dietary
 * requirements, accessibility needs, anything the box office wants
 * collected once per checkout rather than per ticket type. No session needed
 * — read via the checkout layer's own privileged bot token rather than
 * depending on the Public role having the right field permissions.
 */
export default defineEventHandler(async (): Promise<Form | null> => {
	const config = useRuntimeConfig();

	const site = await directusServer.request<{ checkout_form: Form | null }>(
		withToken(
			config.directusOrderBotToken as string,
			readItem('sites', config.public.siteId as string, {
				fields: [{ checkout_form: ['*', { fields: ['*'] }] }] as any,
			}),
		),
	);

	return site.checkout_form ?? null;
});
