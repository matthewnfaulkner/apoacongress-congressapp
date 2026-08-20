<script setup lang="ts">
const usd = ref(100)

const { data, status, error } = useFetch('/api/checkout/ecpay/convert', {
  query: computed(() => ({ usd: usd.value })),
})
</script>

<template>
  <Container class="my-8 max-w-md">
    <h1 class="text-2xl font-semibold text-foreground mb-1">Live USD &rarr; TWD conversion test</h1>
    <p class="text-sm text-description mb-6">Uses the same live-rate lookup as the ECPay checkout redirect.</p>

    <label for="usd-input" class="block text-sm text-description mb-1">USD</label>
    <input
      id="usd-input"
      v-model.number="usd"
      type="number"
      min="0"
      step="0.01"
      class="border border-input rounded-md px-3 py-2 w-full mb-6 bg-transparent"
    />

    <div v-if="status === 'pending'" class="text-description">Converting…</div>
    <div v-else-if="error" class="text-error text-sm">{{ error.data?.statusMessage ?? 'Conversion failed' }}</div>
    <template v-else-if="data">
      <p class="text-3xl font-semibold text-accent">NT${{ data.twd.toLocaleString() }}</p>
      <p class="text-xs text-description mt-1">Rate: 1 USD = {{ data.rate }} TWD</p>
    </template>
  </Container>
</template>
