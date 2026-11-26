<script setup lang="ts">
const { store } = useCheckoutBasket()

// Sandbox never renders Ticket Tailor's widget: CheckoutSandboxPayment
// stands in for paying (see server/api/checkout/sandbox/pay.post.ts).
const isSandbox = Boolean(useRuntimeConfig().public.isSandbox)

// Checked client-side only (onMounted, not top-level) — the persisted
// basket store isn't readable from localStorage during SSR, so a top-level
// check here would wrongly bounce someone who refreshes this page with a
// real bundle already saved.
onMounted(() => {
  if (!store.bundle) navigateTo('/checkout/complete')
})
</script>

<template>
  <Container class="my-8">
    <CheckoutStepper />
    <h1 class="text-2xl font-semibold text-foreground mb-6">Payment</h1>

    <template v-if="store.bundle">
      <CheckoutSandboxPayment v-if="isSandbox" :bundle-id="store.bundle.id" />
      <CheckoutEmbed v-else :checkout-url="store.bundle.checkoutUrl" />
    </template>
  </Container>
</template>
