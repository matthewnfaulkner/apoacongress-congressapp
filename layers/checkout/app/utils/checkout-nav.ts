// Keeps orderId in the URL across step-to-step navigation (Back/Continue),
// so an add-on trip survives the whole flow — including navigating back to
// the registration step — rather than only working forward from the
// original /checkout?orderId=X link. See useCheckoutAddOn.
export function checkoutStepLink(path: string, orderId: string | null) {
  return orderId ? { path, query: { orderId } } : path
}
