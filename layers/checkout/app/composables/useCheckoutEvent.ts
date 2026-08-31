import type { CheckoutEvent } from '../types/checkout'
import { useCheckoutBasketStore } from '../stores/checkout-basket'

export function useCheckoutEvent() {
  const store = useCheckoutBasketStore()
  const auth = useAuthStore()

  // Membership status for *display* purposes (greying out members-only
  // tickets) comes straight from the auth store — the global auth
  // middleware already fetched has_subscription/membership_number onto the
  // logged-in user object, so there's no need for the server to make its
  // own separate Directus round trip just to re-derive the same thing.
  // bundle.post.ts still re-verifies this server-side before actually
  // creating a bundle, so this client-supplied flag isn't a security
  // boundary — it only controls what the UI shows as orderable.
  const isMember = computed(() => {
    const user = auth.isAuthenticated as (DirectusUser & { has_subscription?: boolean | null }) | boolean
    return typeof user === 'object' && Boolean(user.has_subscription || user.membership_number)
  })

  return useFetch<CheckoutEvent>('/api/checkout/event', {
    key: 'checkout-event',
    headers: useRequestHeaders(['cookie']),
    // Client-only: on a full SSR render, auth.isAuthenticated is always false
    // at this point (production's json auth mode keeps its token in
    // localStorage, which the server can't read — see
    // authenticated.global.ts), so a genuine member's SSR render always
    // fetches with member=undefined. Nuxt's hydration then reuses that
    // SSR-hydrated payload for this `key` regardless of what `query`
    // evaluates to on the client, so members_only tickets never correct
    // themselves without a page nav. Forcing this client-only avoids the SSR
    // guess entirely — same fix as my-orders.vue.
    server: false,
    // Reactive: useFetch automatically refetches when `query` changes, so
    // switching store.localityOverride (e.g. the "not in Taiwan?" link) just
    // works — no manual refresh()/watch wiring needed.
    query: computed(() => ({
      locality: store.localityOverride ?? undefined,
      member: isMember.value ? '1' : undefined,
    })),
  })
}
