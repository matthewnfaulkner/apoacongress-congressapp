<script setup lang="ts">
import type { CheckoutEvent, CheckoutStep, CheckoutTicketOption } from '../../types/checkout'

const props = defineProps<{
  checkoutEvent?: CheckoutEvent | null
}>()

type BasketUnit = { lineId: string; option: CheckoutTicketOption }
type BasketGroup = { id: string; name: string; step: CheckoutStep; units: BasketUnit[] }

// Route each step's basket section can send the "Add more" button back to.
const stepPath: Record<CheckoutStep, string> = {
  registration: '/checkout',
  accommodation: '/checkout/accommodation',
  addons: '/checkout/addons',
  tours: '/checkout/tours',
  workshops: '/checkout/workshops',
}

const { store, setQuantity } = useCheckoutBasket()

const route = useRoute()

const groupedUnits = computed<BasketGroup[]>(() => {
  const buckets = new Map<string, BasketGroup>()

  for (const group of checkoutEventGroups(props.checkoutEvent)) {
    // Accommodation is split into one synthetic group per hotel + room size
    // (see checkoutEventGroups) — collapse all of those into a single
    // "Accommodation" bucket here rather than showing each combination as
    // its own section. Every other step already has one group, so this is a
    // no-op for them.
    const bucketId = group.step === 'accommodation' ? 'accommodation' : group.id
    const bucketName = group.step === 'accommodation' ? 'Accommodation' : group.name

    const units = group.options.flatMap((option) => {
      const line = store.lines.find((candidate) => candidate.ticketTypeId === option.id)
      if (!line) return []
      // One row per unit, not one row per ticket type — every purchased
      // ticket is its own line item, not a "N x" quantity on a single row.
      return Array.from({ length: line.quantity }, (_, index): BasketUnit => ({
        lineId: `${option.id}-${index}`,
        option,
      }))
    })

    const bucket = buckets.get(bucketId)
    if (bucket) {
      bucket.units.push(...units)
    } else {
      buckets.set(bucketId, { id: bucketId, name: bucketName, step: group.step, units })
    }
  }

  return Array.from(buckets.values())
})

const allUnits = computed(() => groupedUnits.value.flatMap((group) => group.units))

const subtotal = computed(() => allUnits.value.reduce((sum, unit) => sum + unit.option.price, 0))

const bookingFeeTotal = computed(() => allUnits.value.reduce((sum, unit) => sum + unit.option.bookingFee, 0))

const total = computed(() => subtotal.value + bookingFeeTotal.value)

const currency = computed(() => props.checkoutEvent?.currency ?? 'usd')
const locality = computed(() => props.checkoutEvent?.locality ?? 'international')

const isClearModalOpen = ref(false)

function removeUnit(ticketTypeId: string) {
  const line = store.lines.find((candidate) => candidate.ticketTypeId === ticketTypeId)
  if (!line) return
  setQuantity(ticketTypeId, line.quantity - 1)
}

function confirmClear(close: () => void) {
  store.reset()
  close()
  navigateTo('/checkout')
}
</script>

<template>
  <div class="border border-input rounded-lg p-4 font-mono">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-foreground">Your basket</h3>
      <UButton
        v-if="allUnits.length > 0"
        label="Clear basket"
        icon="i-lucide-rotate-ccw"
        variant="link"
        color="neutral"
        size="lg"
        class="p-0"
        @click="() => { isClearModalOpen = true }"
      />
    </div>

    <p v-if="allUnits.length === 0" class="text-base text-description">No items selected yet.</p>

    <div v-else class="space-y-4">
      <div v-for="group in groupedUnits" :key="group.id">
        <USeparator  type="solid" size="sm" :label="group.name" class="pb-2" :ui="{label: 'text-md font-bold'}"/>
        <p v-if="group.units.length === 0" class="text-muted text-xs text-center">No {{ group.name }} selected</p>
        <ul v-else class="space-y-2">
          <li v-for="unit in group.units" :key="unit.lineId" class="flex justify-between items-baseline text-base gap-2">
            <span>{{ unit.option.name }}</span>
            <span class="flex items-center gap-1 shrink-0">
              <span class="text-lg font-medium">
                {{ formatMoneyLocalized(unit.option.price, unit.option.currency, locality, { showCode: false }) }}
              </span>
              <UTooltip text="Remove from cart">
                <UButton
                  icon="i-lucide-trash"
                  square
                  size="sm"
                  tooltip
                  variant="subtle"
                  color="neutral"
                  :aria-label="`Remove ${unit.option.name} from basket`"
                  @click="removeUnit(unit.option.id)"
                />
              </UTooltip>
            </span>
          </li>
          
        </ul>
        <div class="w-full text-center">
          <UButton
            v-if="route.path === '/checkout/complete'"
            :to="stepPath[group.step]"
            variant="outline"
            :label="`Add ${group.name}`"
            size="sm"
            color="accent"
            class="mx-auto my-2"
          />
        </div>

      </div>
    </div>

    <div v-if="allUnits.length > 0" class="border-t border-input mt-3 pt-3 space-y-1 text-base">
      <div class="flex justify-between items-baseline">
        <span>Subtotal</span>
        <span class="text-lg font-medium">{{ formatMoneyLocalized(subtotal, currency, locality, { showCode: false }) }}</span>
      </div>
      <div class="flex justify-between items-baseline text-description">
        <div class="flex items-center gap-1.5">
          <span>Booking fee</span>
          <UPopover>
            <UButton icon="i-lucide-help-circle" size="xs" color="neutral" variant="subtle" square class="rounded-full" aria-label="What is the booking fee?" />
            <template #content>
              <p class="p-3 text-sm text-description max-w-64">
                All bookings processed are subject to a non-refundable processing fee of 3%.
              </p>
            </template>
          </UPopover>
        </div>
        <span class="text-lg font-medium">{{ formatMoneyLocalized(bookingFeeTotal, currency, locality, { showCode: false }) }}</span>
      </div>
      <div class="flex justify-between items-baseline font-semibold text-foreground pt-1">
        <span>Total</span>
        <span class="text-xl">{{ formatMoneyLocalized(total, currency, locality, { showCode: false }) }}</span>
      </div>
    </div>

    <UModal
      v-model:open="isClearModalOpen"
      title="Clear basket?"
      description="This removes every item from your basket and can't be undone."
    >
      <template #footer="{ close }">
        <div class="flex justify-end gap-2 w-full">
          <UButton label="Cancel" variant="outline" color="neutral" @click="close" />
          <UButton label="Clear basket" color="error" @click="confirmClear(close)" />
        </div>
      </template>
    </UModal>
  </div>
</template>
