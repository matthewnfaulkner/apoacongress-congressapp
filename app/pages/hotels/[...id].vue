<script setup lang="ts">
import type { Hotel } from '#shared/types/schema';

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

type HotelWithCongress = Hotel & { congresses: Array<{ directions: string | null }> };

const { data, error } = await useFetch<HotelWithCongress>('/api/hotel/one', {
	key: `hotel-${id}`,
	query: { id },
});

if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Hotel not found', fatal: true });
}

const hotel = computed(() => data.value!);
const gettingThere = computed(() => hotel.value.congresses?.[0]?.directions ?? null);
const mapsUrl = computed(() => {
	const coords = hotel.value.location?.coordinates;
	if (!coords) return null;
	const [lng, lat] = coords;
	return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
});

const {
	public: { directusUrl },
} = useRuntimeConfig();

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

			<UPageCard orientation="horizontal" class="ring-0 mb-8" highlight-color="accent">
				<template #title>
					<div class="flex items-center gap-2">
						<h1 class="font-heading text-3xl">{{ hotel.name }}</h1>
						<div v-if="hotel.star_rating" class="flex gap-0.5 text-yellow-400">
							<UIcon
								v-for="n in hotel.star_rating"
								:key="n"
								name="i-lucide-star"
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
				</template>

				<NuxtImg
					v-if="hotel.image"
					:src="typeof hotel.image === 'string' ? `${directusUrl}/assets/${hotel.image}` : `${directusUrl}/assets/${(hotel.image as any).id}`"
					class="rounded-lg object-cover h-64 w-full"
					loading="lazy"
				/>
			</UPageCard>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<UPageCard v-if="mapsUrl" class="ring-0">
					<template #header>
						<h2 class="font-heading text-lg">Location</h2>
					</template>
					<template #body>
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

				<UPageCard v-if="gettingThere" class="ring-0">
					<template #header>
						<h2 class="font-heading text-lg">Getting to the Congress from here.</h2>
					</template>
					<template #body>
						<div v-html="gettingThere" class="prose prose-sm max-w-none" />
					</template>
				</UPageCard>

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
			</div>
		</Container>
	</div>
	<div v-else class="text-center text-xl mt-[20%]">404 - Hotel Not Found</div>
</template>
