<script setup lang="ts">

interface PeopleCommitteeProps {
	display: string,
	data: {
		id: string,
		title?: string | null,
		positions: Array<{
			id: string,
			title?: string,
			members: Array<{
				persons_id: {
					id: string,
					title?: string,
					first_name?: string,
					last_name: string | null,
					qualifications: string | null,
					country: {
							countryCodes: string[],
							locale: string
						},
					image: DirectusFile | string,
					bio?: string | null,
					}
			}>
		}>
	};
}

const { setAttr } = useVisualEditing();
const props = defineProps<PeopleCommitteeProps>();

import { computed } from 'vue'


const positionsWithSpan = computed(() =>
  props.data.positions.map(position => {
	const lgspan = Math.min(position.members.length || 1, 4)
	const mdspan = Math.min(position.members.length || 1, 2)
    return {
      ...position,
      class: `sm:col-span-${mdspan} lg:col-span-${lgspan}`
    };
  })
);
</script>

<template>
	<UPageSection :ui="{
		container: 'gap-0 sm:gap-0 lg:gap-0 lg:py-0 py-0 sm:py-0'
	}">
		<div v-if="data.positions" class="min-w-0 max-w-full">
			<Headline :headline="data.title" />
			<UMarquee 
				v-if="props.display == 'marquee'"
				class="max-w-screen" 
				pause-on-hover
				reverse
				:overlay="false"
				:ui="{
					root: 'group relative flex items-center overflow-hidden gap-0',
					content: 'flex items-center shrink-0 justify-around gap-0 ',
				}">
				<div v-for="position in positionsWithSpan" class="flex flex-row">
					<UPageCard
							v-for="person in position.members"
							:key="person.persons_id.id"
							class="text-center ring-0 flex flex-row"
							:to="`/people/${person.persons_id.id}`"
							:ui="{
								container: 'gap-y-0',
								wrapper: 'mx-auto'
							}"
						>
						<template #header class="mx-auto">
							<UBadge :label="position.title" color="accent" class="text-xs mx-auto"></UBadge>
						</template>	

						<ProfileImage class="h-40 mx-auto" :image="person.persons_id.image" />
						<p class="font-heading">
						{{ person.persons_id.first_name }} {{ person.persons_id.last_name }}
						</p>
						<CountryName v-if="person.persons_id.country"
						:country-codes="person.persons_id.country.countryCodes"
						:locale="person.persons_id.country.locale"
						/>
						</UPageCard>
				</div>
			</UMarquee>
			<UPageGrid 
				v-else
				class="relative grid grid-cols-1 xs: sm:grid-cols-2 lg:grid-cols-4 gap-0 sm:gap-8">
				<UPageCard
					v-for="position in positionsWithSpan"
					:key="position.id"
					v-bind="position"
					orientation="vertical"
					highlight-color="accent"
					class="ring-0"
					:ui="{
						root: 'items-baseline',
						container: 'p-0',
						wrapper: 'mx-auto',
						body:'flex-0'
					}"
				>
					<template #title>
						<div></div>
					</template>
					
					<h2 class="text-center text-xl font-heading">
						<UBadge :label="position.title" color="accent" class="text-sm"></UBadge>
					</h2>
					<div
						class="grid gap-6"
						:class="`grid-cols-1 sm:grid-cols-${Math.min(position.members.length, 2)} lg:grid-cols-${Math.min(position.members.length, 4)}`"
						>
						<UPageCard
							v-for="person in position.members"
							:key="person.persons_id.id"
							class="text-center ring-0"
							:to="`/people/${person.persons_id.id}`"
						>	
							<ProfileImage class="h-40 mx-auto" :image="person.persons_id.image" />
							<p class="font-heading">
							{{ person.persons_id.first_name }} {{ person.persons_id.last_name }}
							</p>
							<CountryName v-if="person.persons_id.country"
							:country-codes="person.persons_id.country.countryCodes"
							:locale="person.persons_id.country.locale"
							/>
						</UPageCard>
					</div>
				</UPageCard>
			</UPageGrid>


		</div>
	</UPageSection>

</template>
