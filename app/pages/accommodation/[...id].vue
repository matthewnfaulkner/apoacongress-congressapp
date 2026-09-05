<script setup lang="ts">
import type { GeoJSONPoint, Hotel } from '#shared/types/schema';
import Gallery from '~/components/block/Gallery.vue';

const route = useRoute();
const id = (route.params.id as string[])[0];

const previousRoute = useState<string | null>('previousRoute');
const breadcrumbs = computed(() => {
	const crumbs = [];
	if (previousRoute.value && previousRoute.value !== route.fullPath) {
		crumbs.push({ label: 'Back', icon: 'i-lucide-chevron-left', to: previousRoute.value, class: 'text-accent' });
	}
	return crumbs;
});

type HotelWithCongress = Omit<Hotel, 'gallery' | 'location'> & {
	// schema.ts types every Directus geometry.Point field as a bare string —
	// same override as the venue's own location below.
	location: GeoJSONPoint | null;
	congresses: Array<{
		directions: string | null;
		congress: { venue: { title: string | null; location: GeoJSONPoint | null } | null } | null;
	}>;
	// See server/api/hotel/one.get.ts — gallery is an M2O to a real
	// block_gallery row now, not schema.ts's stale DirectusFile[] shape.
	gallery: {
		id: string;
		tagline: string | null;
		headline: string | null;
		items: Array<{ id: string; sort: number | null; caption: string | null; directus_file: { id: string; filename_download: string; type: string | null } }>;
	} | null;
};

const { data, error } = await useFetch<HotelWithCongress>('/api/hotel/one', {
	key: `hotel-${id}`,
	headers: useRequestHeaders(['cookie']),
	query: { id },
});

if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Hotel not found', fatal: true });
}

const hotel = computed(() => data.value!);
const siteDataStore = useSiteDataStore();
const venueTitle = computed(() => {
	const congress = (siteDataStore.siteData as Site).congress?.[0];
	const venue = congress && typeof congress !== 'string' ? congress.venue : null;
	return venue && typeof venue !== 'string' ? (venue.title ?? null) : null;
});
// A map/link showing directions from the hotel to the congress venue is
// meaningless when the hotel IS the venue (on-site accommodation) — the
// written instructions (gettingThere) still make sense though (e.g. "take
// the lobby elevator to the conference floor"), so only the map/button are
// gated on this, not the whole section.
const isHotelTheVenue = computed(() => Boolean(venueTitle.value) && hotel.value.name === venueTitle.value);
const gettingThere = computed(() => hotel.value.congresses?.[0]?.directions ?? null);
const mapsUrl = computed(() => {
	const coords = hotel.value.location?.coordinates;
	if (!coords) return null;
	const [lng, lat] = coords;
	return `https://www.google.com/maps/search/?api=1&query=${hotel.value.name},${lat},${lng}`;
});

// Directions "from here" (the hotel) "to there" (the congress venue) —
// Google Maps' directions endpoint (not the plain search one mapsUrl uses
// above), origin/destination both as lat,lng pairs since both hotels.location
// and venues.location are already geocoded. Same computed as
// CheckoutHotelDetailsModal.vue.
const directionsToVenueUrl = computed(() => {
	const origin = hotel.value.location?.coordinates;
	const destination = venueCoordinates.value;
	if (!origin || !destination || isHotelTheVenue.value) return null;

	const [originLng, originLat] = origin;
	const [destLng, destLat] = destination;
	return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`;
});

const venueCoordinates = computed(() => hotel.value.congresses?.[0]?.congress?.venue?.location?.coordinates ?? null);

const hotelUrl = useRequestURL();
useSeoMeta({
	title: hotel.value.name ?? '',
	description: hotel.value.address ?? '',
	ogTitle: hotel.value.name ?? '',
	ogDescription: hotel.value.address ?? '',
	ogUrl: hotelUrl.toString(),
});
</script>

<template>
	<div v-if="hotel">
		<Container class="py-12">
			<UBreadcrumb v-if="breadcrumbs.length" :items="breadcrumbs" class="mb-6" />

			<UPageCard orientation="horizontal" class="ring-0 mb-8" highlight-color="accent" reverse >
				<template #title>
					<div class="flex items-center gap-2">
						<h1 class="font-heading text-3xl">{{ hotel.name }}</h1>
						<div v-if="hotel.star_rating" class="flex gap-0.5 text-yellow-400">
							<UIcon
								v-for="n in hotel.star_rating"
								:key="n"
								name="i-material-symbols-star-rate"
								class="w-5 h-5 fill-current"
							/>
						</div>
					</div>
				</template>
				<template #description>
					<div class="space-y-1 text-sm text-muted mt-2">
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
						:to="`/api/hotel/${id}/book`"
						target="_blank"
						color="accent"
						size="xl"
						icon="i-lucide-calendar-check"
						class="mt-4 w-full justify-center"
						label="Book Now"
					/>
				</template>
				<template #footer>
					<UPageCard v-if="hotel.ammenities?.length" class="ring-0 md:col-span-2">
						<template #header>
							<h2 class="font-heading text-lg">Amenities</h2>
						</template>
						<template #body>
							<div class="flex flex-wrap gap-2">
								<UBadge
									v-for="amenity in hotel.ammenities"
									:key="amenity"
									:label="amenity"
									variant="subtle"
									color="neutral"
									class="text-sm"
								/>
							</div>
						</template>
				</UPageCard>
				</template>

				<DirectusImage
					v-if="hotel.image"
					:uuid="hotel.image"
					:alt="hotel.name ?? ''"
					:width="900"
					class="rounded-lg object-cover h-64 w-full"
					loading="lazy"
				/>
			</UPageCard>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<UPageCard v-if="mapsUrl" class="ring-0" :ui="{body: 'w-full'}">
					<template #header>
						<h2 class="font-heading text-lg">Location</h2>
					</template>
					<template #body>
						<GoogleMapEmbed
							v-if="hotel.location?.coordinates"
							:origin-lat="hotel.location.coordinates[1]"
							:origin-lng="hotel.location.coordinates[0]"
							:title="hotel.name ?? ''"
							class="mb-3 h-75 w-full"
						/>

						<UButton
							:to="mapsUrl"
							target="_blank"
							rel="noopener"
							variant="outline"
							color="neutral"
							icon="i-lucide-map-pin"
							class="w-full justify-center"
						>
							View on Google Maps
						</UButton>


					</template>
				</UPageCard>

				<UPageCard v-if="gettingThere" class="ring-0" :ui="{body: 'w-full'}">
					<template #header>
						<h2 class="font-heading text-lg">Getting to the Congress from the {{ hotel.name }}.</h2>
					</template>
					<template #body>
						<GoogleMapEmbed
							v-if="!isHotelTheVenue && hotel.location?.coordinates && venueCoordinates"
							:origin-lat="hotel.location.coordinates[1]"
							:origin-lng="hotel.location.coordinates[0]"
							:destination-lat="venueCoordinates[1]"
							:destination-lng="venueCoordinates[0]"
							:title="hotel.name ?? ''"
							class="mb-3 h-75 w-full"
						/>
						<div v-html="gettingThere" class="prose max-w-none" />
						
					</template>
					<template #footer>
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
							Directions to the congress venue
						</UButton>
					</template>
				</UPageCard>

			</div>

			<Gallery v-if="hotel.gallery" :data="hotel.gallery" class="mt-8" />
		</Container>
	</div>
	<div v-else class="text-center text-xl mt-[20%]">404 - Hotel Not Found</div>
</template>
