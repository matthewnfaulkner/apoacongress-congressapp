<script setup lang="ts">
// Shared landing page for two different ways of getting here: Ticket
// Tailor's single order-redirect URL (see server/api/checkout/redirect.get.ts
// — carries ?tt_order_id=, so this page can fetch a summary to display) and ECPay's
// own ClientBackURL once its payment finishes (carries no Ticket Tailor
// order data at all, so this degrades to a generic message in that case).
const { store } = useCheckoutBasket()
const route = useRoute()

const orderId = computed(() => (typeof route.query.tt_order_id === 'string' ? route.query.tt_order_id : null))

const { data: order } = useFetch('/api/checkout/order-summary', {
  query: { tt_order_id: orderId },
  immediate: !!orderId.value,
})

const heading = computed(() => {
  if (!order.value) return 'Thanks for your order'
  if (order.value.status === 'completed') return 'Order confirmed'
  if (order.value.status === 'cancelled') return 'Order cancelled'
  return 'Payment pending'
})

onMounted(() => {
  store.reset()

  // If Ticket Tailor's checkout widget redirects without breaking out of the
  // CheckoutEmbed iframe itself, this confirmation would otherwise render
  // trapped inside that small embedded frame instead of taking over the tab.
  if (window.top && window.top !== window.self) {
    window.top.location.href = window.location.href
  }
})
</script>

<template>
  <Container class="my-8 max-w-xl">
    <h1 class="text-2xl font-semibold text-foreground mb-2">{{ heading }}</h1>

    <p v-if="order?.status === 'completed'" class="text-description">
      Your order (<span class="font-medium text-foreground">{{ order.id }}</span>) for
      <span class="font-medium text-foreground">{{ formatMoney(order.total, order.currency) }}</span>
      is confirmed. You'll receive your tickets by email shortly.
    </p>
    <p v-else-if="order?.status === 'cancelled'" class="text-description">
      Your order (<span class="font-medium text-foreground">{{ order.id }}</span>) was cancelled and has not been
      charged.
    </p>
    <p v-else-if="order" class="text-description">
      Your order (<span class="font-medium text-foreground">{{ order.id }}</span>) for
      <span class="font-medium text-foreground">{{ formatMoney(order.total, order.currency) }}</span>
      is still awaiting payment — it isn't confirmed yet. If you were following payment instructions, please
      complete those; otherwise this should resolve automatically shortly.
    </p>
    <p v-else class="text-description">
      Your order is being confirmed with our ticketing provider now — this is usually immediate, but can take a
      moment for some payment methods. You'll receive your order confirmation and tickets by email once it's done.
    </p>

    <p class="text-description mt-4">
      If anything looks wrong or you don't receive a confirmation shortly, please
      <NuxtLink to="/support" class="text-accent underline">contact support</NuxtLink>.
    </p>
  </Container>
</template>
