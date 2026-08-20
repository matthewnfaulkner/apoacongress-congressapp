import { useCheckoutBasketStore } from '../stores/checkout-basket'

// Client-only by design: the basket itself only lives in localStorage
// (see checkout-basket.ts), so there's no SSR-accuracy to preserve here either
// — this just upgrades the persisted store once the browser confirms the
// orderId in the URL belongs to the logged-in customer. This doesn't put the
// checkout flow into an "editing" mode — bundle.post.ts always creates a
// brand new bundle/order regardless of orderId. All orderId actually does is
// mark this as an add-on trip (the customer already has a registration from
// that order) so CheckoutStepPage can skip requiring a fresh selection.
export function useCheckoutAddOn() {
  const route = useRoute()
  const store = useCheckoutBasketStore()

  // Watches route.query.orderId rather than a plain onMounted: /checkout and
  // /checkout?orderId=X are the same route, just a different query string, so
  // Vue Router reuses the already-mounted component instead of remounting it
  // — onMounted alone would never re-run, so starting a fresh, no-orderId
  // checkout right after an add-on trip (in the same SPA session, no full
  // page reload) would silently keep the stale add-on state.
  if (import.meta.client) {
    watch(
      () => (typeof route.query.orderId === 'string' ? route.query.orderId : null),
      (orderId) => {
        if (!orderId) {
          // Only the registration page (/checkout) is a genuine entry point —
          // every later step is reached via internal "Continue" navigation,
          // which deliberately doesn't carry orderId in the URL, relying on
          // the store's already-set add-on state instead (see
          // checkout/index.vue's next-path). Landing on the entry page
          // without orderId means this is a fresh visit, not a continuation,
          // so any add-on state left over from a previous trip must be
          // cleared here — otherwise a genuinely new registration would
          // silently inherit "add-on" behavior (skippable required-selection)
          // from that old, unrelated order.
          if (route.path === '/checkout' && store.isAddOn) store.clearAddOn()
          return
        }

        if (store.orderId === orderId) return

        $fetch<{ valid: boolean }>('/api/checkout/order', { query: { orderId } })
          .then((result) => {
            if (result.valid) store.setAddOnOrder(orderId)
          })
          .catch(() => {
            // Invalid/unauthorized/nonexistent orderId — proceed as a normal new order.
          })
      },
      { immediate: true },
    )
  }

  return {
    isAddOn: computed(() => store.isAddOn),
    // For building step-to-step nav links that keep orderId in the URL (see
    // checkoutStepLink in checkout-nav.ts) — without that, the Back button
    // (a plain path, no query) would land on /checkout with no orderId and
    // get treated as a genuinely fresh visit, wiping this state.
    orderId: computed(() => store.orderId),
  }
}
