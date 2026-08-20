<script setup lang="ts">
defineProps<{ orderId: string | null }>()
</script>

<template>
  <p v-if="orderId" class="text-3xl text-description font-mono mb-6 bg-tertiary/20 p-2">Adding to Order #{{ orderId.slice(3) }}</p>
</template>
