<script setup lang="ts">
import { useCheckoutBasketStore } from '../../stores/checkout-basket'

defineProps<{ orderId: string | null }>()

// "Add tickets" trip for a registration (see useCheckoutAddOn).
const store = useCheckoutBasketStore()
</script>

<template>
  <p v-if="orderId" class="text-3xl text-description font-mono mb-6 bg-tertiary/20 p-2">Adding to Order — #{{ orderId.slice(3) }}</p>
  <p v-else-if="store.registrationId" class="text-2xl text-description mb-6 bg-tertiary/20 p-2">Adding tickets for {{ store.addOnLabel ?? 'your registration' }}</p>
</template>
