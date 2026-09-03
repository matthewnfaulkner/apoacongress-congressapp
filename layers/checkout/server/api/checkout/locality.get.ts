import type { H3Event } from 'h3';

/**
 * Pure IP-geo locality, with no client-supplied override applied (unlike
 * bundle.post.ts's own use of resolveCheckoutLocality) — this is specifically
 * for checkout/index.vue's "redirect Taiwan visitors" nudge, which needs to
 * know what geo-IP actually detected regardless of anything the customer
 * later overrides for pricing purposes.
 */
export default defineEventHandler((event: H3Event) => {
	return { locality: resolveCheckoutLocality(event) };
});
