<script setup lang="ts">
import type { CongressHotel, Hotel, Site } from '#shared/types/schema';

const siteDataStore = useSiteDataStore();
const congressTitle = computed(() => (siteDataStore.siteData as Site).title ?? 'The congress');

const { data, error } = await useFetch<CongressHotel[]>('/api/hotel', {
	key: 'hotels',
	headers: useRequestHeaders(['cookie']),
});

if (error.value) {
	throw createError({ statusCode: 500, statusMessage: 'Failed to load hotels', fatal: true });
}

// Filters out any congress_hotels row whose hotel relation didn't come back
// populated (an orphaned junction row, or a permission gap on the hotels
// side) rather than letting it crash the card grid on `.id` access below.
const hotels = computed(() => (data.value ?? []).filter((row) => row.hotel && typeof row.hotel === 'object'));

const pageUrl = useRequestURL();
useSeoMeta({
	title: 'Hotels',
	description: 'Recommended hotels for APOA 2027 Taiwan.',
	ogTitle: 'Hotels',
	ogDescription: 'Recommended hotels for APOA 2027 Taiwan.',
	ogUrl: pageUrl.toString(),
});
</script>

<template>
	<Container class="py-12">
		<Headline class="font-heading text-4xl mb-4" headline="Congress Hotels" />
		<p class="text-muted max-w-2xl mb-10">
			{{ congressTitle }} has arranged special rates for congress attendees at a variety of luxurious hotels — book your stay today.
		</p>

		<div v-if="!hotels.length" class="text-muted text-center py-20">
			No hotels found.
		</div>

		<UPageGrid v-else class="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1  gap-4">
			<UPageCard
				v-for="row in hotels"
				:key="(row.hotel as Hotel).id"
				:to="`/accommodation/${(row.hotel as Hotel).id}`"
				highlight-color="accent"
				orientation="horizontal"
				spotlight
				spotlight-color="secondary"
				class="cursor-pointer hover:ring-1 hover:ring-accent transition-shadow"
				variant="outline"
				reverse
				:ui="{
					header: 'justify-end flex w-full'
				}"
			>
					<DirectusImage
						v-if="(row.hotel as Hotel).image"
						:uuid="(row.hotel as Hotel).image"
						:alt="(row.hotel as Hotel).name ?? ''"
						class="rounded-lg object-cover h-40 w-full "
						loading="lazy"
					/>
					<div v-else class="h-40 flex items-center justify-center bg-elevated rounded-lg">
						<UIcon name="i-lucide-bed-double" class="text-4xl text-muted" />
					</div>
				<template #leading >
					<div v-if="(row.hotel as Hotel).star_rating" class="flex gap-0.5 text-yellow-400 shrink-0">
							<UIcon
								v-for="n in (row.hotel as Hotel).star_rating!"
								:key="n"
								name="i-material-symbols-star-rate"
								class="w-4 h-4 fill-current"
							/>
						</div>
				</template>
				<template #title>
					<div class="flex items-center gap-2">
						<span class="font-sans text-3xl">{{ (row.hotel as Hotel).name }}</span>
					</div>
				</template>
				<template #header>
					<UBadge 
						v-if="row.tagline" 
						:label="row.tagline" v
						ariant="solid" 
						size="md" 
						color="tertiary" 
						class="max-w-[50%] uppercase text-wrap text-black text-right"
						:ui="{
							label: 'text-wrap overflow-visible'
						}"
				/>
				
				</template>
				<template #description>
					<div v-if="(row.hotel as Hotel).ammenities" class="flex flex-wrap gap-2 pt-2">
								<UBadge
									v-for="amenity in (row.hotel as Hotel).ammenities"
									:key="amenity"
									:label="amenity"
									variant="subtle"
									color="neutral"
									class="text-sm"
								/>
							</div>
				</template>
			</UPageCard>
		</UPageGrid>
	</Container>
</template>
