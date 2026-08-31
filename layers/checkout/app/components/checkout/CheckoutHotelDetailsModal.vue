<script setup lang="ts">
import type { GeoJSONPoint, Hotel } from '#shared/types/schema'

const props = defineProps<{
  hotelId: string
}>()

const isOpen = defineModel<boolean>('open', { default: false })

type HotelWithCongress = Hotel & {
  congresses: Array<{
    directions: string | null
    congress: { venue: { title: string | null; location: GeoJSONPoint | null } | null } | null
  }>
}

const { data: hotel, status, execute } = useFetch<HotelWithCongress>('/api/hotel/one', {
  key: `checkout-hotel-modal-${props.hotelId}`,
  query: { id: props.hotelId },
  headers: useRequestHeaders(['cookie']),
  immediate: false,
})

watch(isOpen, (open) => {
  if (open && !hotel.value) execute()
})

const mapsUrl = computed(() => {
  const coords = hotel.value?.location?.coordinates
  if (!coords) return null
  const [lng, lat] = coords
  return `https://www.google.com/maps/search/?api=1&query=${hotel.value?.name},${lat},${lng}`
})

const venue = computed(() => hotel.value?.congresses?.[0]?.congress?.venue ?? null)
const siteDataStore = useSiteDataStore()
const venueTitle = computed(() => {
  const congress = (siteDataStore.siteData as Site).congress?.[0]
  const siteVenue = congress && typeof congress !== 'string' ? congress.venue : null
  return siteVenue && typeof siteVenue !== 'string' ? (siteVenue.title ?? null) : null
})

// Directions "from here" (the hotel) "to there" (the congress venue) —
// Google Maps' directions endpoint (not the plain search one mapsUrl uses
// above), origin/destination both as lat,lng pairs since both hotels.location
// and venues.location are already geocoded.`
const directionsToVenueUrl = computed(() => {
  const origin = hotel.value?.location?.coordinates
  const destination = venue.value?.location?.coordinates
  if (!origin || !destination) return null
  if(hotel.value?.name == venueTitle.value) return null

  const [originLng, originLat] = origin
  const [destLng, destLat] = destination
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`
})
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

        <div v-if="status === 'pending'" class="text-sm text-description">Loading…</div>

        <template v-else-if="hotel">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-xl font-semibold text-foreground">{{ hotel.name }}</h2>
            <div v-if="hotel.star_rating" class="flex gap-0.5 text-warning">
              <UIcon v-for="n in hotel.star_rating" :key="n" name="i-material-symbols-star-rate" class="size-4 fill-current" />
            </div>
          </div>

          <DirectusImage
            v-if="hotel.image"
            :uuid="hotel.image"
            :alt="hotel.name ?? ''"
            class="rounded-lg object-cover h-48 w-full mb-4"
            loading="lazy"
          />

          <div class="space-y-1 text-sm text-description">
            <p v-if="hotel.address" class="flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="shrink-0" />
              {{ hotel.address }}
            </p>
            <p v-if="hotel.phone" class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="shrink-0" />
              <a :href="`tel:${hotel.phone}`" class="hover:text-accent">{{ hotel.phone }}</a>
            </p>
            <p v-if="hotel.website" class="flex items-center gap-2">
              <UIcon name="i-lucide-globe" class="shrink-0" />
              <a :href="hotel.website" target="_blank" rel="noopener" class="hover:text-accent">{{ hotel.website }}</a>
            </p>
            <p v-if="hotel.rooms" class="flex items-center gap-2">
              <UIcon name="i-lucide-bed-double" class="shrink-0" />
              {{ hotel.rooms }} rooms
            </p>
          </div>

          <UButton
            v-if="mapsUrl"
            :to="mapsUrl"
            target="_blank"
            rel="noopener"
            variant="outline"
            color="neutral"
            icon="i-lucide-map-pin"
            class="w-full justify-center mt-4"
          >
            View on Google Maps
          </UButton>



          <div v-if="hotel.congresses?.[0]?.directions" class="mt-4">
            <h3 class="text-sm font-semibold text-foreground mb-1">Directions</h3>
            <div class="prose prose-sm max-w-none text-description" v-html="hotel.congresses[0].directions" />
          </div>
                    <UButton
            v-if="directionsToVenueUrl"
            :to="directionsToVenueUrl"
            target="_blank"
            rel="noopener"
            variant="outline"
            color="accent"
            icon="i-lucide-route"
            class="w-full justify-center mt-2"
          >
            Getting to the congress from the {{ hotel.name }}
          </UButton>

          <div v-if="hotel.ammenities?.length" class="flex flex-wrap gap-2 mt-4">
            <UBadge
              v-for="amenity in hotel.ammenities"
              :key="amenity"
              :label="amenity"
              variant="subtle"
              color="neutral"
              class="text-sm"
            />
            <UButton  color="accent" variant="outline" size="xl" class="mx-auto my-5" @click="close" label="Back to Checkout" />

          </div>
        </template>
      </div>
      
    </template>
    
  </UModal>
</template>
