<script setup lang="ts">

const toCountry = (c: Object | string | null | undefined) =>
	typeof c === 'object' && c !== null ? c as { countryCodes: string[]; locale: string } : null

interface PeopleListProps {
	showCountry?: boolean;
	showFlag?: boolean;
	showTitle?: boolean;
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

const { setAttr } = useVisualEditing();
const props = defineProps<PeopleListProps>();

import { computed } from 'vue'


const people = computed(() =>
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
			<UPageGrid class="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
				<PersonProfileCard
					v-for="person in people"
					:key="person.id"
					:id="person.id ?? ''"
					:first-name="person.first_name"
					:last-name="person.last_name"
					:title="person.title"
					:image="person.image"
					:country="toCountry(person.country)"
					:show-title="showTitle"
					:show-flag="showFlag"
					:show-country="showCountry"
					:extratitle="person.extratitle"
					:extratopic="person.extratopic"
					highlight-color="accent"
					card-class="h-full justify-center"
					image-class="h-50"
					:ui="{
						wrapper: 'items-center',
						body: 'flex-0',
						footer: 'mt-0',
						title: 'text-xs w-full font-heading',
						name: 'text-xl font-heading',
						flag: 'inline-flex items-center justify-center w-7 h-7 rounded-full overflow-hidden text-lg leading-none',
					}"
				/>
			</UPageGrid>

		</div>
	</UPageSection>

</template>
