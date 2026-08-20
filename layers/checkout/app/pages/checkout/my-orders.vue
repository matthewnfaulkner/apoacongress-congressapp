<script setup lang="ts">
import type { TTOrder } from '../../types/ticket-tailor'

// Sourced from the auth store (reactive Pinia state — see
// authenticated.global.ts's setAuth) rather than reading
// $directusTokenStorage.get() directly: a plain localStorage read isn't a
// reactive dependency Vue can track, so a computed based on it would only
// ever evaluate once. That still wouldn't help on the server, though —
// production's json auth mode keeps its token in localStorage, which flat
// out doesn't exist during SSR — so this fetch is forced client-only
// (`server: false`, same trick profile.vue uses via its onMounted-gated
// `ready` flag) and only ever runs once the browser has a real token.
const auth = useAuthStore()
const requestCookieHeaders = useRequestHeaders(['cookie'])
// Same object-vs-false idiom useCheckoutEvent.ts uses for isMember — the auth
// store's isAuthenticated is either `false` or the logged-in user object.
const isLoggedIn = computed(() => typeof auth.isAuthenticated === 'object')

const { data: orders, status, error } = useFetch<TTOrder[]>('/api/checkout/my-orders', {
  key: 'my-orders',
  server: false,
  // /api/checkout/my-orders 401s outright without a session — no point
  // firing the request at all for a guest.
  immediate: isLoggedIn.value,
  headers: computed(() => ({
    ...requestCookieHeaders,
    ...(auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : {}),
  })),
})

</script>

<template>

<Container class="my-8 max-w-2xl">
    <UError v-if="!isLoggedIn"
      redirect="/login"
      :clear="{
        color: 'accent',
        size: 'xl',
        icon: 'i-lucide-log-in',
        class: 'rounded-full',
        label: 'Log In',
      }"
      :error="{
        statusCode: 401,
        statusMessage: 'Log in to see your orders',
        message: ''
      }"
    />
    <template v-else>
    <h1 class="text-2xl font-semibold text-foreground mb-6 font-heading">My Orders</h1>

    <div v-if="status === 'pending' || status === 'idle'" class="text-description">Loading your orders…</div>
    <div v-else-if="error" class="text-error">{{error}}Could not load your orders right now. Please try again shortly.</div>
    <div v-else-if="!orders || orders.length === 0" class="text-description">We couldn't find any orders for your account yet.</div>

    <div v-else class="flex flex-col gap-6">
      <div v-for="order in orders" :key="order.id" class="border border-input rounded-lg p-4">
        <div class="flex justify-between items-center mb-1">
          <h2 class="font-semibold text-foreground font-mono">Order #{{ order.id.slice(3) }}</h2>
          <UBadge :color="orderStatusColor(order)" variant="solid" size="xl" :label="orderStatusLabel(order)" />
        </div>

        <p class="text-md text-description mb-4">{{ orderDate(order) }}</p>

        <ul class="space-y-2 mb-4">
          <li v-for="ticket in issuedTickets(order)" :key="ticket.id" class="flex justify-between text-sm gap-4">
            <span>{{ ticket.description }}<span v-if="ticket.full_name"> — {{ ticket.full_name }}</span></span>
            <span v-if="ticket.listed_price !== null" class="font-medium shrink-0">{{ formatMoney(ticket.listed_price, order.currency.code) }}</span>
          </li>
        </ul>

        <div class="border-t border-input pt-3 mb-4 space-y-1">
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

        <div class="flex gap-3">
          <UButton
            :to="`/checkout/order/${order.id}`"
            variant="subtle"
            color="secondary"
            size="xl"
            label="View Details"
          />
        </div>
      </div>
    </div>
    </template>
  </Container>
</template>
