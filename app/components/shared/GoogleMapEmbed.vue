<script setup lang="ts">
// Origin/destination each accept EITHER known coordinates OR a plain text
// place query (e.g. an airport name/IATA code) — the Embed API's directions
// mode resolves a string itself, so a query point never needs geocoding.
const props = defineProps<{
	originLat?: number
	originLng?: number
	originQuery?: string
	title?: string
	// Single-marker mode (no route) when neither destination prop is given.
	destinationLat?: number
	destinationLng?: number
	destinationQuery?: string
}>()

const config = useRuntimeConfig()

const originParam = computed(() => (props.originLat !== undefined && props.originLng !== undefined ? `${props.originLat},${props.originLng}` : props.originQuery))
const destinationParam = computed(() => (props.destinationLat !== undefined && props.destinationLng !== undefined ? `${props.destinationLat},${props.destinationLng}` : props.destinationQuery))
const hasDestination = computed(() => destinationParam.value !== undefined)

// The Maps Embed API's own directions view is the "standard Google Maps
// directions interface" — mode tabs (car/transit/walk/bike) and clickable
// route alternatives are already built into it, so there's no need to
// reimplement that with DirectionsService/DirectionsRenderer.
const embedSrc = computed(() => {
  const params = new URLSearchParams({ key: config.public.googleMapsApiKey as string })

  if (hasDestination.value && originParam.value && destinationParam.value) {
    params.set('origin', originParam.value)
    params.set('destination', destinationParam.value)
    // Only sets the default selected tab — car/walk/bike are still one click
    // away in the embed's own mode switcher.
    params.set('mode', 'transit')
    return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`
  }

  if (originParam.value) {
    params.set('q', originParam.value)
    return `https://www.google.com/maps/embed/v1/place?${params.toString()}`
  }

  return null
})
</script>

<template>
  <iframe
    v-if="embedSrc"
    :src="embedSrc"
    :title="title ?? 'Map'"
    class="rounded-lg border-0"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
  />
</template>
