<script setup lang="ts">
const { data: checkoutEvent, status, error } = useCheckoutEvent()
const { quantityFor, setQuantity } = useCheckoutBasket()
const { orderId } = useCheckoutAddOn()

const selectedHotelId = ref<string | null>(null)
const selectedRoomSizeId = ref<string | null>(null)

const hotels = computed(() => checkoutEvent.value?.accommodationHotels ?? [])

const selectedHotel = computed(() => hotels.value.find((entry) => entry.id === selectedHotelId.value) ?? null)

const roomSizesWithFromPrice = computed(() => {
  if (!selectedHotel.value) return []

  return selectedHotel.value.roomSizes.map((roomSize) => {
    const cheapest = roomSize.stays.reduce((min, stay) => (stay.price < min.price ? stay : min), roomSize.stays[0]!)
    return { ...roomSize, fromPrice: cheapest.price, fromCurrency: cheapest.currency }
  })
})

const selectedRoomSize = computed(
  () => selectedHotel.value?.roomSizes.find((roomSize) => roomSize.id === selectedRoomSizeId.value) ?? null,
)

const hasAccommodationInBasket = computed(() =>
  hotels.value.some((hotel) =>
    hotel.roomSizes.some((roomSize) => roomSize.stays.some((stay) => quantityFor(stay.id) > 0)),
  ),
)

function selectHotel(hotelId: string) {
  selectedHotelId.value = hotelId
  selectedRoomSizeId.value = null
}

function backToHotels() {
  selectedHotelId.value = null
  selectedRoomSizeId.value = null
}

function backToRoomSizes() {
  selectedRoomSizeId.value = null
}

function handleBack() {
  if (selectedRoomSize.value) {
    backToRoomSizes()
    return
  }
  if (selectedHotel.value) {
    backToHotels()
    return
  }
  navigateTo(checkoutStepLink('/checkout/addons', orderId.value))
}

const breadcrumbItems = computed(() => {
  const items: { label: string; onClick?: () => void }[] = [
    { label: 'Hotels', onClick: selectedHotel.value ? backToHotels : undefined },
  ]

  if (selectedHotel.value) {
    items.push({
      label: selectedHotel.value.hotel.name,
      onClick: selectedRoomSize.value ? backToRoomSizes : undefined,
    })
  }

  if (selectedRoomSize.value) {
    items.push({ label: selectedRoomSize.value.name })
  }

  return items
})

const showDetails = ref(false)

</script>

<template>
  
  <Container class="my-8">
    <CheckoutStepper />
    <h1 class="text-2xl font-semibold text-foreground mb-2">Choose your accommodation package</h1>

    <CheckoutAddOnBanner :order-id="orderId" />

    <div class="flex items-center gap-3 mb-6">

      <UBreadcrumb :items="breadcrumbItems" size="xl" separator-icon="i-lucide-arrow-right" :ui="{link : 'text-xl'}"/>

      <CheckoutHotelDetailsModal v-if="selectedHotel" v-model:open="showDetails" :hotel-id="selectedHotel.id" />

    </div>
      <UButton 
        v-if="selectedHotel" 
        color="secondary" 
        class="mb-5" 
        variant="outline" 
        size="xl" 
        icon="i-lucide-arrow-left" 
        @click="handleBack" 
        :label="selectedHotel ? selectedRoomSize ? 'Change Occupancy' : 'Select a different hotel.' : ''"
      />
      <UButton 
        v-if="selectedHotel"
        type="button" 
        class="text-md text-secondary underline text-left p-4 pt-1" 
        @click="() => {showDetails = true}"
        label="View hotel details"
      />

    <div v-if="status === 'pending' || status === 'idle'" key="pending" class="min-h-[50vh] flex items-center justify-center">
      <UProgress color="secondary" size="xl" :v-model="null" class="w-50" />
    </div>
    <div v-else-if="error" key="error" class="text-error">Could not load options right now. Please try again shortly.</div>
    <div v-else-if="hotels.length === 0" key="empty" class="text-description">No accommodation options are available yet.</div>

    <div v-else key="loaded" class="flex flex-col lg:flex-row gap-8">
      <div class="flex-1 flex flex-col gap-3">
        <div v-if="!selectedHotel" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CheckoutHotelTile v-for="entry in hotels" :key="entry.id" :hotel="entry.hotel" @select="selectHotel(entry.id)" />
        </div>

        <template v-else-if="!selectedRoomSize">
          <p class="text-description text-lg font-bold" >Select Occupancy</p>
          <button
            v-for="roomSize in roomSizesWithFromPrice"
            :key="roomSize.id"
            type="button"
            class="flex justify-between items-center gap-4 text-left border border-input rounded-lg p-4 hover:border-accent transition-colors"
            @click="selectedRoomSizeId = roomSize.id"
          >
            <span class="font-semibold text-foreground min-w-0">{{ roomSize.name }}</span>
            <span class="text-accent font-semibold shrink-0">
              From {{ formatMoneyLocalized(roomSize.fromPrice, roomSize.fromCurrency, checkoutEvent?.locality ?? 'international') }}
            </span>
          </button>
        </template>

        <template v-else>
          <div class="flex flex-col gap-2">
            <CheckoutTicketOptionCard
              v-for="stay in selectedRoomSize.stays"
              :key="stay.id"
              :option="stay"
              :quantity="quantityFor(stay.id)"
              @update:quantity="(value: number) => setQuantity(stay.id, value)"
            />
          </div>
        </template>
      </div>

      <div class="lg:w-80 flex flex-col gap-4">
        <CheckoutBasketSummary :checkout-event="checkoutEvent" />
      </div>
    </div>

    <div class="flex justify-between mt-8 flex-row">
      <UButton variant="outline" color="accent" @click="handleBack" label="Back" />
      <div class="flex gap-4">
        <UButton
          v-if="hasAccommodationInBasket"
          key="add-rooms"
          @click="backToHotels()"
          icon="i-lucide-plus"
          color="secondary"
          size="xl"
          variant="outline"
          label="Add Additional Rooms"
        />

        <UButton
          key="continue"
          :to="checkoutStepLink('/checkout/tours', orderId)"
          color="accent"
          size="xl"
          :label="hasAccommodationInBasket ? 'Continue' : 'Continue without accommodation'"
        />
      </div>
    </div>
  </Container>
</template>
