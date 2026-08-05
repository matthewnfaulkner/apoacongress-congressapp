<script setup lang="ts">

interface PeopleCommitteeProps {
	display: string,
	showCountry?: boolean,
	showFlag?: boolean,
	showTitle?: boolean,
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

const flatMembers = computed(() =>
  props.data.positions.flatMap(position =>
    position.members.map(member => ({
      ...member,
      positionTitle: position.title,
    }))
  )
);
</script>

<template>
	<UPageSection :ui="{
		container: 'gap-0 sm:gap-0 lg:gap-0 lg:py-0 py-0 sm:py-0'
	}">
		<div v-if="data.positions" class="min-w-0 max-w-full">
			
			<UMarquee 
				v-if="props.display == 'marquee'"
				class="max-w-screen" 
				pause-on-hover
				
				:overlay="false"
				:ui="{
					root: 'group relative flex items-start overflow-hidden gap-0',
					content: 'flex items-start shrink-0 justify-around gap-0 [animation-delay:2.5s]',
				}">
					<PersonProfileCard
						v-for="member in flatMembers"
						:key="member.persons_id.id"
						:id="member.persons_id.id"
						:first-name="member.persons_id.first_name"
						:last-name="member.persons_id.last_name"
						:title="member.persons_id.title"
						:image="member.persons_id.image"
						:country="member.persons_id.country"
						:badge="member.positionTitle"
						:show-title="showTitle"
						:show-flag="showFlag"
						:show-country="showCountry"
						card-class="flex flex-row w-50"
						image-class="h-40"
						:ui="{ badge: 'text-sm mx-auto', name: 'font-sans', body: 'mx-auto', header: 'mx-auto h-10 flex flex-col justify-center' }"
					/>
			</UMarquee>
			
			<div
				v-else
				class="relative flex flex-wrap justify-center gap-0 sm:gap-2">
				
				<PersonProfileCard
					v-for="member in flatMembers"
					:key="member.persons_id.id"
					:id="member.persons_id.id"
					:first-name="member.persons_id.first_name"
					:last-name="member.persons_id.last_name"
					:title="member.persons_id.title"
					:image="member.persons_id.image"
					:country="member.persons_id.country"
					:badge="member.positionTitle"
					:show-title="showTitle"
					:show-flag="showFlag"
					:show-country="showCountry"
					card-class="w-full sm:w-[calc(50%-0.25rem)] lg:w-[calc(25%-0.375rem)] shrink-0 grow-0 align-items-start"
					image-class="h-70 lg:h-40"
					:ui="{
						container: 'sm:p-1 gap-y-0',
						badgeWrapper: 'text-center font-sans whitespace-normal h-15 align-items-center flex flex-row',
						badge: 'text-sm h-fit m-auto',
						name: 'font-sans h-[2lh] text-2xl sm:text-lg',
						body: 'mx-auto',
						header: 'mx-auto',
						footer: 'w-full'
					}"
				/>
			</div>


		</div>
	</UPageSection>

</template>
