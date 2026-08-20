<script setup lang="ts">
import type { CheckoutTicketOption } from '../../types/checkout'

defineProps<{
  option: CheckoutTicketOption
}>()

const isOpen = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal v-model:open="isOpen" fullscreen>
    <template #content="{ close }">
      <div class="p-6 max-w-lg mx-auto relative">
        <UButton
          icon="i-lucide-x"
          square
          variant="ghost"
          color="neutral"
          class="absolute top-4 right-4"
          aria-label="Close"
          @click="close"
        />

        <h2 class="text-xl font-semibold text-foreground mb-4">{{ option.name }}</h2>

        <!-- richDescription and shortDescription (congress_charges.description
             / short_description) are rich text/HTML from Directus, same
             v-html convention used elsewhere (e.g. person.bio in
             profile.vue). description (Ticket Tailor's own) is plain text.
             shortDescription is the card's own preview text — only shown
             here as a last-resort fallback, for a charge that has a
             short_description but no fuller description set. -->
        <div v-if="option.richDescription" class="text-sm text-description" v-html="option.richDescription"></div>
        <p v-else-if="option.description" class="text-sm text-description">{{ option.description }}</p>
        <div v-else-if="option.shortDescription" class="text-sm text-description" v-html="option.shortDescription"></div>

        <UButton color="accent" variant="outline" size="xl" class="mx-auto my-5 flex" @click="close" label="Back to Checkout" />
      </div>
    </template>
  </UModal>
</template>
