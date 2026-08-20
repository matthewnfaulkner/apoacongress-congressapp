import { defineStore } from 'pinia'
import type { BasketLine, CheckoutBundle } from '../types/checkout'

interface CheckoutBasketState {
  lines: BasketLine[]
  bundle: CheckoutBundle | null
  // The pre-existing order this basket is adding on to, if any — see
  // useCheckoutAddOn. Doesn't mean this basket edits that order: checkout
  // always creates a new, separate bundle regardless of orderId.
  orderId: string | null
  isAddOn: boolean
  // Manual "not in Taiwan?" override — null means defer to the server's
  // IP-based auto-detection. Lives here (persisted, same as the rest of the
  // basket) rather than a cookie: it's a plain client-side preference, and
  // the server never needs to know it before the client's first request.
  localityOverride: 'national' | 'international' | null
  // Set by bundle.post.ts (see CreateBundleResponse.guestToken) for a guest
  // checkout — persisted here (survives the full round trip to Ticket
  // Tailor's hosted checkout and back, unlike in-memory state) so
  // confirmation.vue can present it as this order's ownership proof once the
  // customer lands back on the confirmation page with no account to check
  // ownership through otherwise.
  guestOrderToken: string | null
  // The optional checkout_form's field values (see complete.vue), persisted
  // so they survive navigating away from the review step and back — e.g.
  // the stepper's Back button — rather than the form resetting to blank on
  // every remount.
  checkoutFormValues: Record<string, any> | null
}

export const useCheckoutBasketStore = defineStore('checkoutBasket', {
  state: (): CheckoutBasketState => ({
    lines: [],
    bundle: null,
    orderId: null,
    isAddOn: false,
    localityOverride: null,
    guestOrderToken: null,
    checkoutFormValues: null,
  }),
  getters: {
    quantityFor: (state) => (ticketTypeId: string) =>
      state.lines.find((line) => line.ticketTypeId === ticketTypeId)?.quantity ?? 0,
    totalQuantity: (state) => state.lines.reduce((sum, line) => sum + line.quantity, 0),
    isEmpty: (state) => state.lines.length === 0,
  },
  actions: {
    setQuantity(ticketTypeId: string, quantity: number) {
      // Any basket change invalidates a previously-created bundle — it gets
      // regenerated next time the customer reaches checkout.
      this.bundle = null

      if (quantity <= 0) {
        this.lines = this.lines.filter((line) => line.ticketTypeId !== ticketTypeId)
        return
      }

      const existing = this.lines.find((line) => line.ticketTypeId === ticketTypeId)
      if (existing) {
        existing.quantity = quantity
      } else {
        this.lines.push({ ticketTypeId, quantity })
      }
    },
    setBundle(bundle: CheckoutBundle) {
      this.bundle = bundle
    },
    setGuestOrderToken(token: string | null) {
      this.guestOrderToken = token
    },
    setCheckoutFormValues(values: Record<string, any>) {
      this.checkoutFormValues = values
    },
    setAddOnOrder(orderId: string) {
      this.orderId = orderId
      this.isAddOn = true
    },
    clearAddOn() {
      this.orderId = null
      this.isAddOn = false
    },
    setLocalityOverride(locality: 'national' | 'international' | null) {
      this.bundle = null
      this.localityOverride = locality
    },
    reset() {
      this.lines = []
      this.bundle = null
      this.orderId = null
      this.isAddOn = false
      this.guestOrderToken = null
      this.checkoutFormValues = null
      // localityOverride deliberately not reset — it's a standing preference,
      // not part of "the basket" that gets cleared on order completion.
    },
  },
  persist: true,
})
