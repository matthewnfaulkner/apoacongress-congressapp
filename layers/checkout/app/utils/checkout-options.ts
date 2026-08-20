import type { CheckoutEvent, CheckoutGroup, CheckoutStep, CheckoutTicketOption } from '../types/checkout'

// The order steps actually happen in the checkout flow — used so groups come
// back in that order rather than whatever order Object.values(...) and the
// accommodation-append below would otherwise produce.
const STEP_ORDER: CheckoutStep[] = ['registration', 'addons', 'accommodation', 'tours', 'workshops']

// Accommodation is nested (hotel -> room size -> stay length) rather than a
// flat CheckoutGroup like the other steps, but everywhere else in the app
// (basket summary line items, bundle-creation validation) just needs "all
// selectable options, bucketed by a group id + name" — so accommodation gets
// flattened into synthetic groups here (one per hotel + room size) rather
// than every consumer needing to know about the nested shape separately.
export function checkoutEventGroups(checkoutEvent: CheckoutEvent | null | undefined): CheckoutGroup[] {
  if (!checkoutEvent) return []

  const accommodationGroups: CheckoutGroup[] = checkoutEvent.accommodationHotels.flatMap((hotelEntry) =>
    hotelEntry.roomSizes.map((roomSize) => ({
      id: roomSize.id,
      name: `${hotelEntry.hotel.name} — ${roomSize.name}`,
      step: 'accommodation' as const,
      sortOrder: 0,
      minPerOrder: null,
      maxPerOrder: null,
      options: roomSize.stays,
    })),
  )

  return STEP_ORDER.flatMap((step) => (step === 'accommodation' ? accommodationGroups : checkoutEvent.steps[step]))
}

export function checkoutEventOptions(checkoutEvent: CheckoutEvent | null | undefined): CheckoutTicketOption[] {
  return checkoutEventGroups(checkoutEvent).flatMap((group) => group.options)
}
