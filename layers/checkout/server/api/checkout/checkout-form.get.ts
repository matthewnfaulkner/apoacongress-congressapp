import type { Form } from '#shared/types/schema';

/**
 * The optional form (Directus sites.checkout_form) shown alongside the
 * basket on the checkout review page (see complete.vue) — e.g. dietary
 * requirements, accessibility needs, anything the box office wants
 * collected once per checkout rather than per ticket type. Public data, same
 * as the rest of the checkout event response — no session needed to read it.
 */
export default defineEventHandler(async (): Promise<Form | null> => {
	const config = useRuntimeConfig();

	const site = await directusServer.request<{ checkout_form: Form | null }>(
		readItem('sites', config.public.siteId as string, {
			fields: [{ checkout_form: ['*', { fields: ['*'] }] }] as any,
		}),
	);

	return site.checkout_form ?? null;
});
