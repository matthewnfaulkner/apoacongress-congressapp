<script setup lang="ts">
import type { TTOrder } from '../../../types/ticket-tailor'

const route = useRoute()
const orderId = route.params.id as string

// Same client-only trick as my-orders.vue: production's json auth mode keeps
// its token in localStorage, which the server can't read during SSR, so
// this fetch is forced client-only rather than guessing wrong on the server.
const auth = useAuthStore()
const requestCookieHeaders = useRequestHeaders(['cookie'])

const { data: order, status, error } = useFetch<TTOrder>(`/api/checkout/order/${orderId}`, {
  key: `checkout-order-${orderId}`,
  server: false,
  headers: computed(() => ({
    ...requestCookieHeaders,
    ...(auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : {}),
  })),
})
</script>

<template>
  <Container class="my-8 max-w-2xl">
    <UButton to="/checkout/my-orders" variant="ghost" color="neutral" icon="i-lucide-arrow-left" label="Back to my orders" class="mb-6" />

    <div v-if="status === 'pending' || status === 'idle'" class="text-description">Loading order…</div>
    <div v-else-if="error" class="text-error">Could not load this order right now. Please try again shortly.</div>

    <div v-else-if="order" class="border border-input rounded-lg p-4 font-mono">
      <div class="flex justify-between items-center mb-1">
        <h1 class="text-2xl font-semibold text-foreground">Order #{{ order.id.slice(3) }}</h1>
        <UBadge :color="orderStatusColor(order)" variant="solid" size="xl" :label="orderStatusLabel(order)" />
      </div>

      <p class="text-md text-description mb-1">{{ orderDate(order) }}</p>
      <p v-if="order.payment_method?.name" class="text-sm text-description mb-6">Paid via {{ order.payment_method.name }}</p>
      <p v-else class="mb-6" />

      <h2 class="font-semibold text-foreground mb-3">Tickets</h2>
      <ul class="space-y-3 mb-6">
        <li v-for="ticket in issuedTickets(order)" :key="ticket.id" class="border border-input rounded-md p-3">
          <div class="flex justify-between text-sm gap-4">
            <span class="font-medium">{{ ticket.description }}</span>
            <span v-if="ticket.listed_price !== null" class="font-medium shrink-0">{{ formatMoney(ticket.listed_price, order.currency.code) }}</span>
          </div>
          <p v-if="ticket.full_name" class="text-sm text-description">{{ ticket.full_name }}</p>
          <p v-if="ticket.email" class="text-sm text-description">{{ ticket.email }}</p>
          <dl v-if="ticketCustomFields(order, ticket).length" class="mt-2 bg-elevated rounded-md p-2">
            <p class="text-xs font-semibold text-description uppercase tracking-wide mb-0.5">Ticket Holder Details</p>
            <div v-for="field in ticketCustomFields(order, ticket)" :key="field.name" class="flex gap-1 text-sm">
              <dt class="text-description">{{ field.name }}:</dt>
              <dd class="font-bold" :class="{ 'text-description italic': field.answer === null }">{{ field.answer ?? 'Not given' }}</dd>
            </div>
          </dl>
        </li>
      </ul>

      <div class="border-t border-input pt-3 mb-6 space-y-1">
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
      <template v-if="order.local_invoices?.length">
        <h2 class="font-semibold text-foreground mb-3">Invoices</h2>
        <ul class="mb-6">
          <template v-for="(invoice, index) in order.local_invoices" :key="invoice.id">
            <USeparator v-if="index > 0" />
            <li class="flex items-center gap-2 py-2">
              <span class="text-sm text-description">{{ new Date(invoice.uploaded_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }} -</span>

              <UButton
                :to="`/api/checkout/order/${order.id}/invoice/${invoice.id}`"
                target="_blank"
                variant="ghost"
                color="neutral"
                size="xl"
                icon="i-lucide-download"
                :label="invoice.filename_download"
              />
            </li>
          </template>
        </ul>
      </template>

      <div
        class="gap-2 flex">
        <UButton
          :to="`/checkout?orderId=${order.id}`"
          variant="outline"
          color="accent"
          size="xl"
          class="m-right"
          label="Add to My Booking"
        />
        <UButton
          :to="{ path: '/contact', query: { issue: `Order #${order.id.slice(3)}: ` } }"
          variant="ghost"
          color="neutral"
          size="xl"
          icon="i-material-symbols-help"
          class="m-right"
          label="Get Help"
        />
      </div>
    </div>
  </Container>
</template>
