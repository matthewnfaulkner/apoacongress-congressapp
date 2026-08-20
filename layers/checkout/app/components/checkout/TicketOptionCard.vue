<script setup lang="ts">
import type { CheckoutTicketOption } from '../../types/checkout'

const props = defineProps<{
  option: CheckoutTicketOption
  quantity: number
}>()

const emit = defineEmits<{ 'update:quantity': [value: number] }>()

const { data: checkoutEvent } = useCheckoutEvent()
const locality = computed(() => checkoutEvent.value?.locality ?? 'international')

const maxSelectable = computed(() => Math.min(props.option.maxPerOrder, props.option.quantityRemaining))

const statusMessage = computed(() => {
  if (props.option.isSoldOut) return 'Sold out'

  if (props.option.requiresMembership && !props.option.isOrderable) {
    return 'APOA Members only — sign in with a member account to purchase'
  }

  return null
})

function updateQuantity(delta: number) {
  const next = Math.min(Math.max(props.quantity + delta, 0), maxSelectable.value)
  emit('update:quantity', next)
}

const showDetails = ref(false)
</script>

<template>
  <div
    class="flex items-center justify-between gap-4 border rounded-lg p-3"
    :class="option.isOrderable ? 'border-input' : 'border-input opacity-60'"
  >
    <div class="min-w-0">
      <UBadge v-if="option.tagline" :label="option.tagline" variant="solid" color="info" size="lg" class="mb-1" />
      <h3 class="text-foreground font-semibold text-lg lg:text-2xl">{{ option.name }}</h3>
      <!-- shortDescription (congress_charges.short_description) is the card's
           own preview text — the fuller richDescription/description live in
           the "View details" modal instead of being truncated here. -->
      <div v-if="option.shortDescription" v-html="option.shortDescription" class="text-description text-md mt-0.5 mb-4 line-clamp-1">
      </div>
      <UButton
        v-if="option.richDescription"
        variant="outline"
        color="secondary"
        size="xl"
        @click="() => {showDetails = true}"
        label="View More Details..."
      >
    </UButton>
      <p v-if="statusMessage" class="text-description text-md font-bold mt-0.5">{{ statusMessage }}</p>
    </div>

    <CheckoutTicketOptionDetailsModal
      v-if="option.richDescription"
      v-model:open="showDetails"
      :option="option"
    />

    <div class="flex items-center gap-4 shrink-0 flex-col lg:flex-row">
      <div class="text-right whitespace-nowrap">
        <p class="text-accent font-semibold">{{ formatMoneyLocalized(option.price, option.currency, locality) }}</p>
        <p v-if="option.bookingFee > 0" class="text-xs text-description">
          + {{ formatMoneyLocalized(option.bookingFee, option.currency, locality) }} fee
        </p>
      </div>

      <div v-if="option.isOrderable" class="flex items-center gap-2">
        <UButton variant="outline" size="sm" color="accent" :disabled="quantity <= 0" @click="updateQuantity(-1)" icon="i-lucide-minus" />
        <span class="w-5 text-center">{{ quantity }}</span>
        <UButton variant="solid" size="sm" color="accent" :disabled="quantity >= maxSelectable" icon="i-lucide-plus" @click="updateQuantity(1)" />
      </div>
    </div>
  </div>
</template>
