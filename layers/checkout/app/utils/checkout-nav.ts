import { useCheckoutBasketStore } from '../stores/checkout-basket'

// Keeps orderId in the URL across step-to-step navigation (Back/Continue),
// so an add-on trip survives the whole flow — including navigating back to
// the registration step — rather than only working forward from the
// original /checkout?orderId=X link. See useCheckoutAddOn.
//
// Same for an "Add tickets" trip (?registrationId), read from the basket
// store so the existing callers don't need to pass it.
export function checkoutStepLink(path: string, orderId: string | null) {
  if (orderId) return { path, query: { orderId } }

  const registrationId = useCheckoutBasketStore().registrationId
  return registrationId ? { path, query: { registrationId } } : path
}
