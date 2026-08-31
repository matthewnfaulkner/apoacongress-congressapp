<script setup lang="ts">
const { store } = useCheckoutBasket()

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

    <CheckoutEmbed v-if="store.bundle" :checkout-url="store.bundle.checkoutUrl" />
  </Container>
</template>
