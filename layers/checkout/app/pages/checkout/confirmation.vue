<script setup lang="ts">
import type { TTOrder } from '../../types/ticket-tailor'

// Ticket Tailor's single shared order-redirect URL (see server/api/checkout/
// redirect.get.ts) forwards tt_order_id straight through here, so this looks
// up that exact order (ownership-checked against the logged-in customer
// server side, via /api/checkout/order/:id) rather than guessing "whichever
// order is newest" — that heuristic broke if a customer had placed another
// order moments earlier. Guest checkouts have no account to check ownership
// against at all, so they fall back to a generic "check your email" message
// instead, same as order-complete.vue shows when it has no order data.
const route = useRoute()
const { store } = useCheckoutBasket()
const auth = useAuthStore()
const requestCookieHeaders = useRequestHeaders(['cookie'])

const orderId = typeof route.query.tt_order_id === 'string' ? route.query.tt_order_id : null

// Read before onMounted's store.reset() clears it — bundle.post.ts minted
// this at checkout time for a guest basket (see CreateBundleResponse.guestToken)
// and the checkout basket store persisted it across the round trip to Ticket
// Tailor's hosted checkout and back.
const guestOrderToken = store.guestOrderToken

// Same object-vs-false idiom useCheckoutEvent.ts uses for isMember — the auth
// store's isAuthenticated is either `false` or the logged-in user object.
const isLoggedIn = computed(() => typeof auth.isAuthenticated === 'object')

// Logged in: look the order up ownership-checked against the session (see
// /api/checkout/order/:id). Guest: no session to check ownership through, so
// the token minted at checkout time (read from the store above, never from
// this page's own URL) stands in instead, via its own dedicated route (see
// order-by-token.get.ts) rather than as a ?token= fallback on the general
// order/:id page route. Neither: nothing to look up.
const lookupUrl = computed(() => {
  if (!orderId) return null
  if (isLoggedIn.value) return `/api/checkout/order/${orderId}`
  if (guestOrderToken) return `/api/checkout/order-by-token?tt_order_id=${orderId}&token=${guestOrderToken}`
  return null
})

const canLookUpOrder = computed(() => Boolean(lookupUrl.value))

const { data: order, refresh } = useFetch<TTOrder>(() => lookupUrl.value ?? '', {
  key: `checkout-order-confirmation-${orderId}`,
  server: false,
  immediate: !!lookupUrl.value,
  headers: computed(() => ({
    ...requestCookieHeaders,
    ...(auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : {}),
  })),
})

// Named function rather than an inline template arrow — see the same note
// in order/[id].vue.
function handleProofUploaded(proof: NonNullable<TTOrder['local_payment_proof']>) {
  if (order.value) order.value.local_payment_proof = proof
}

const heading = computed(() => {
  if (!order.value) return 'Processing your order'
  if (order.value.status === 'completed') return 'Order confirmed'
  if (order.value.status === 'cancelled') return 'Order cancelled'
  return 'Payment pending'
})

const statusIcon = computed(() => {
  if (!order.value) return null
  if (order.value.status === 'completed') return 'i-lucide-check-circle'
  if (order.value.status === 'cancelled') return 'i-lucide-x-circle'
  return 'i-lucide-clock'
})

// A refresh that resolves instantly (order already there, cached response,
// etc.) would otherwise flash the button's loading state so fast it barely
// reads as having done anything — this keeps the spin visible for at least
// 600ms regardless of how fast the actual refetch is.
async function handleRefresh() {
  await Promise.all([refresh(), new Promise((resolve) => setTimeout(resolve, 600))])
}

// Cleared for 'completed' or 'pending' - both mean the customer actually
// finished checkout (pending just covers payment methods that settle
// asynchronously, e.g. bank transfer). Only 'cancelled' leaves it alone,
// since that's the only case where they didn't actually complete anything.
watch(
  order,
  (newOrder) => {
    if (newOrder?.status === 'completed' || newOrder?.status === 'pending') store.reset()
  },
  { immediate: true },
)

onMounted(() => {
  // If Ticket Tailor's checkout widget redirects without breaking out of the
  // CheckoutEmbed iframe itself, this confirmation would otherwise render
  // trapped inside that small embedded frame instead of taking over the tab.
  if (window.top && window.top !== window.self) {
    window.top.location.href = window.location.href
  }
})
</script>

<template>
  <Container class="my-8 max-w-2xl">
    <UError v-if="!orderId"
      :clear="{
        color: 'neutral',
        size: 'xl',
        icon: 'i-lucide-arrow-left',
        class: 'rounded-full',
        label: 'Home',
      }"
      :error="{
        statusCode: 404,
        statusMessage: 'Order not Found',
        message: ''
      }"
    />
    <UError v-else-if="!canLookUpOrder"
      :clear="{
        color: 'neutral',
        size: 'xl',
        icon: 'i-lucide-arrow-left',
        class: 'rounded-full',
        label: 'Home',
      }"
      :error="{
        statusCode: 403,
        statusMessage: 'Unable to verify this order',
        message: 'Log in to view your order, or check your email for your confirmation from Ticket Tailor.'
      }"
    />
    <div v-else>
      <div class="flex flex-col items-center text-center gap-3 mb-12">
        <UIcon
          v-if="order"
          :name="statusIcon!"
          size="64"
          :class="{ 'text-success': order.status === 'completed', 'text-error': order.status === 'cancelled', 'text-warning': order.status !== 'completed' && order.status !== 'cancelled' }"
        />
        <UIcon v-else name="i-lucide-loader-circle" size="56" class="animate-spin text-accent" />

        <h1 class="text-3xl lg:text-4xl font-bold text-foreground">{{ heading }}</h1>

        <p v-if="order" class="text-description text-lg">
          Order #{{ order.id.slice(3) }} · {{ formatMoney(order.total, order.currency.code) }}
        </p>
      </div>

      <div v-if="order" class="border border-input rounded-lg p-4 font-mono">
        <div class="flex justify-between items-center mb-1">
          <h2 class="text-xl font-semibold text-foreground">Order details</h2>
          <UBadge :color="orderStatusColor(order)" variant="solid" size="xl" :label="orderStatusLabel(order)" />
        </div>

        <p class="text-md text-description mb-1">{{ orderDate(order) }}</p>
        <p v-if="order.payment_method?.name" class="text-sm text-description mb-1">Payment via {{ order.payment_method.name }}</p>

        <CheckoutPaymentProofUpload
          v-if="isAwaitingManualPayment(order)"
          :order-id="order.id"
          :existing-proof="order.local_payment_proof"
          :guest-token="guestOrderToken"
          :instructions="order.payment_method?.instructions"
          class="mb-6"
          @uploaded="handleProofUploaded"
        />
        <p v-else class="mb-6" />

        <h3 class="font-semibold text-foreground mb-3">Tickets</h3>
        <ul class="space-y-3 mb-6">
          <li v-for="ticket in issuedTickets(order)" :key="ticket.id" class="border border-input rounded-md p-3">
            <div class="flex justify-between text-sm gap-4">
              <span class="font-medium">{{ ticket.description }}</span>
              <span v-if="ticket.listed_price !== null" class="font-medium shrink-0">{{ formatMoney(ticket.listed_price, order.currency.code) }}</span>
            </div>
            <p v-if="ticket.full_name" class="text-sm text-description">{{ ticket.full_name }}</p>
            <p v-if="ticket.email" class="text-sm text-description">{{ ticket.email }}</p>
          </li>
        </ul>

        <div class="border-t border-input pt-3 space-y-1">
          <div class="flex justify-between text-sm">
            <span>Subtotal</span>
            <span class="font-medium">{{ formatMoney(orderSubtotal(order), order.currency.code) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>Booking fee</span>
            <span class="font-medium">{{ formatMoney(orderBookingFee(order), order.currency.code) }}</span>
          </div>
          <div class="flex justify-between font-semibold text-foreground pt-1">
            <span>Total</span>
            <span>{{ formatMoney(order.total, order.currency.code) }}</span>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center gap-4 text-center text-description">
        <p>
          Your order is still being processed by our ticketing provider — this is usually immediate, but can take a
          moment for some payment methods.
        </p>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          loading-icon="i-lucide-refresh-cw"
          variant="outline"
          color="accent"
          loading-auto
          @click="handleRefresh"
        />
      </div>

      <p class="text-description mt-6">
        If anything looks wrong or you don't receive a confirmation shortly, please
        <NuxtLink  :to="{ path: '/contact', query: { issue: `Order #${orderId.slice(3)}: ` } }" class="text-accent underline">contact support</NuxtLink>.
      </p>
    </div>
  </Container>
</template>
