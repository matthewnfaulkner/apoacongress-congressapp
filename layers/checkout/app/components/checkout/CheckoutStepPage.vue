<script setup lang="ts">
import type { CheckoutStep } from '../../types/checkout'

const props = defineProps<{
  step: CheckoutStep
  title: string
  previousPath?: string
  nextPath: string
  nextLabel?: string
  // When true, at least one option from this step's groups must be in the
  // basket to continue — unless this is an add-on trip (an existing customer
  // adding more tickets/accommodation to an order they already have), which
  // is allowed to skip selection entirely (see useCheckoutAddOn).
  requireSelection?: boolean
}>()

const { data: checkoutEvent, status, error } = useCheckoutEvent()
const { quantityFor, setQuantity } = useCheckoutBasket()
const { isAddOn, orderId } = useCheckoutAddOn()

const groups = computed(() => checkoutEvent.value?.steps[props.step] ?? [])

const hasSelection = computed(() =>
  groups.value.some((group) => group.options.some((option) => quantityFor(option.id) > 0)),
)

const canContinue = computed(() => !props.requireSelection || isAddOn.value || hasSelection.value)

const stepNouns: Record<CheckoutStep, string> = {
  registration: 'registration',
  addons: 'add-ons',
  tours: 'tours',
  workshops: 'workshops',
}

const continueLabel = computed(() => {
  if (props.requireSelection || hasSelection.value) return props.nextLabel ?? 'Continue'
  return `Continue without ${stepNouns[props.step]}`
})
</script>

<template>
  <Container class="my-8">
    <CheckoutStepper />


    <CheckoutAddOnBanner :order-id="orderId" />

    <slot name="banner" />

    <div v-if="status === 'pending' || status === 'idle'" class="min-h-[50vh] flex items-center justify-center">
      <UProgress color="secondary" size="xl" :v-model="null" class="w-50" />
    </div>
    <div v-else-if="error" class="text-error">Could not load options right now. Please try again shortly.</div>
    <div v-else-if="groups.length === 0" class="text-description">Nothing to select for this step.</div>

    <div v-else class="flex flex-col lg:flex-row gap-8">
      <div class="flex-1 flex flex-col gap-8">
        <section v-for="group in groups" :key="group.id">
          <h1 class="text-4xl font-semibold text-foreground mb-3">{{ group.name }}</h1>
          <div class="flex flex-col gap-2">
            <CheckoutTicketOptionCard
              v-for="option in group.options"
              :key="option.id"
              :option="option"
              :quantity="quantityFor(option.id)"
              @update:quantity="(value: number) => setQuantity(option.id, value)"
            />
          </div>
        </section>
            <p  v-if="step != 'registration'" class="py-4 text-muted">
      Can't decide? Don't worry you can come back after registration and add on.
    </p>
      </div>
      
      <div class="lg:w-80 flex flex-col gap-4">
        <CheckoutBasketSummary :checkout-event="checkoutEvent" />
        <p v-if="requireSelection && !canContinue" class="text-sm text-error">Add at least one registration package to continue.</p>
        <div class="flex justify-between w-full">
          <UButton v-if="previousPath" :to="checkoutStepLink(previousPath, orderId)" size='xl' variant="outline" color="accent" label="Back" />
          <div v-else />
          <UButton :to="checkoutStepLink(nextPath, orderId)" color="accent" size="xl" :disabled="!canContinue" :label="continueLabel" />
        </div>
      </div>
    </div>
  </Container>
</template>
