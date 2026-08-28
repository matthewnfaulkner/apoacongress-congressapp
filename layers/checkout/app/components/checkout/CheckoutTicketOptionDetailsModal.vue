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
      <div class="h-full overflow-y-auto">
        <div
          class="p-6 mx-auto relative"
          :class="option.detailsPermalink ? 'max-w-lg lg:max-w-none' : 'max-w-lg lg:max-w-4xl'"
        >
          <UButton
            icon="i-lucide-x"
            square
            size="xl"
            variant="ghost"
            color="neutral"
            class="absolute top-4 right-4"
            aria-label="Close"
            @click="close"
          />

          <!-- Details-page content brings its own heading/back-to-top affordances
               (page blocks, hero, etc.), so the modal's own title and a top
               "Back to Checkout" are only shown for that path; the plain
               rich-text fallback keeps its original title + single bottom button. -->
          <h2 v-if="!option.detailsPermalink" class="text-xl font-semibold text-foreground mb-4">{{ option.name }}</h2>
          <UButton
            v-if="option.detailsPermalink"
            color="accent" variant="outline" size="xl" class="mx-auto my-5 flex" @click="close" label="Back to Checkout"
          />

          <!-- detailsPermalink (congress_charges.details_page) points at a page
               in the pages collection — when set it takes priority over the
               rich text fields below, rendering that page's blocks instead.
               richDescription and shortDescription (congress_charges.description
               / short_description) are rich text/HTML from Directus, same
               v-html convention used elsewhere (e.g. person.bio in
               profile.vue). description (Ticket Tailor's own) is plain text.
               shortDescription is the card's own preview text — only shown
               here as a last-resort fallback, for a charge that has a
               short_description but no fuller description set. -->
          <CheckoutPageContent v-if="option.detailsPermalink" :permalink="option.detailsPermalink" />
          <div v-else-if="option.richDescription" class="text-sm text-description" v-html="option.richDescription"></div>
          <p v-else-if="option.description" class="text-sm text-description">{{ option.description }}</p>
          <div v-else-if="option.shortDescription" class="text-sm text-description" v-html="option.shortDescription"></div>

          <UButton v-if="!option.detailsPermalink" color="accent" variant="outline" size="xl" class="mx-auto my-5 flex" @click="close" label="Back to Checkout" />
        </div>
      </div>
    </template>
  </UModal>
</template>
