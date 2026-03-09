<script setup lang="ts">

interface PeopleListProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
		entry: Array<{
			person: Person
			extra1: string
			extra2: string
		}>
		type: string;
		events: Array<{
			congress_events_id: CongressEvent
		}>
		assignments: Array<{
			assignments_id: Assignment
		}>
	};
}

interface PersonCard extends Person {
	extratitle?: String | null;
	extratopic?: String | null;
}

const { setAttr } = useVisualEditing();
const props = defineProps<PeopleListProps>();

import { computed } from 'vue'


const people = computed<PersonCard[]>(() => 
	{
		switch (props.data.type) {
			case "events":
				return props.data.events.flatMap((event) => {
					return event.congress_events_id.assignments.flatMap((assignment) => 
						({ 
							...assignment.person, 
							extratitle: event.congress_events_id.title,
							extratopic: event.congress_events_id.topic
						})
					)
				})
			case "assignments":
				return props.data.assignments.flatMap((assignment)=> ({
						...assignment.assignments_id.person, 
						extratitle: assignment.assignments_id.event?.title,
						extratopic: assignment.assignments_id.event?.topic
				}
				))
			case "people":
			default:
				return props.data.entry.flatMap((persons)=> ({
						...persons.person,
						extratitle: persons.extra1,
						extratopic: persons.extra2})
				)
		}
});



</script>

<template>

	<UPageSection :ui="{
		container: 'gap-0 sm:gap-0 lg:gap-0 lg:py-0'
	}">
		<div v-if="people">
			<Headline :headline="data.headline" />
			<UPageGrid class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
				<UPageCard
					v-for="person in people"
					:key="person.id"
					highlight-color="accent"
					orientation="vertical"
					class="text-center h-full justify-center ring-0"
					:to="`/people/${person.id}`"
					:ui="{
						wrapper: 'items-center',
						body: 'flex-0',
						footer: 'mt-0'
					}"
				>
					<template #header>
						
					</template>

					<template #body>
						<DirectusImage
							class="h-50"
							
							:uuid="person.image"
						/>
					</template>
					<template #footer >
						<Tagline
							class="text-xs w-full font-heading "
							:tagline="person.title"
						/>
						<Text
							class="text-xl font-heading"
							:content="`${person.first_name} ${person.last_name}` || ''"
						/>
						<CountryName
							:country-codes="person?.country?.countryCodes"
							:locale="person?.country?.locale"
						/>
						<div class="text-accent" v-if="person.extratitle">{{ person.extratitle }}</div>
						<div v-if="person.extratopic" class="font-bold">{{ person.extratopic }}</div>
					</template>
				</UPageCard>
			</UPageGrid>

		</div>
	</UPageSection>

</template>
