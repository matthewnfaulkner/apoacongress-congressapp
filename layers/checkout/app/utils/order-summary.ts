import type { TTIssuedTicket, TTOrder } from '../types/ticket-tailor'

// Shared between my-orders.vue (the list) and checkout/order/[id].vue (a
// single order's detail breakdown) so the two stay in sync.

export function orderStatusLabel(order: TTOrder) {
  if (order.status === 'completed') return 'Confirmed'
  if (order.status === 'cancelled') return 'Cancelled'
  return 'Payment pending'
}

export function orderStatusColor(order: TTOrder) {
  if (order.status === 'completed') return 'success'
  if (order.status === 'cancelled') return 'error'
  return 'warning'
}

export function orderDate(order: TTOrder) {
  const date = new Date(order.created_at * 1000)
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}`
}

// Individual physically-issued tickets rather than line_items (purchase
// summary rows grouped by ticket type — a "2 x General Admission" row rather
// than two separate tickets). Voided tickets aren't current holdings, so
// they're excluded.
export function issuedTickets(order: TTOrder) {
  return (order.issued_tickets ?? []).filter((ticket) => ticket.status === 'valid')
}

// Pulled from order.local_issued_tickets (the congress_orders row's own
// repeater, matched by ticket id) rather than the Ticket Tailor ticket
// itself — see TTOrder.local_issued_tickets.
export function ticketCustomFields(order: TTOrder, ticket: TTIssuedTicket) {
  const localTicket = order.local_issued_tickets?.find((t) => t.id === ticket.id)
  return localTicket?.custom_fields ?? []
}

function bundleLineItem(order: TTOrder) {
  return order.line_items.find((item) => item.type === 'bundle')
}

// Every order here was created from one of our bundles (see bundle.post.ts),
// which sends a single combined price/booking_fee covering the whole basket
// rather than per ticket type — Ticket Tailor carries those back on the
// order as the "bundle"-type line item's own value/booking_fee, so that's
// used directly instead of order.subtotal or re-deriving/summing per ticket.
export function orderSubtotal(order: TTOrder) {
  return bundleLineItem(order)?.value ?? order.subtotal
}

export function orderBookingFee(order: TTOrder) {
  return bundleLineItem(order)?.booking_fee ?? 0
}
