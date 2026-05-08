<script setup lang="ts">
import PeopleSpeaker from '~/components/block/PeopleSpeaker.vue';
import PeopleList from './PeopleList.vue';
import { type BlockPeoplePeople } from '~~/shared/types/schema';
import PeopleCommittee from './PeopleCommittee.vue';

interface PeopleProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
		display: string;
		show_country: boolean;
		show_title: boolean;
		show_flag: boolean;
		people: BlockPeoplePeople[]
	};
}

const { setAttr } = useVisualEditing();
const props = defineProps<PeopleProps>();


const validPeople = computed(() =>
	props.data.people.filter(
		(people): people is BlockPeoplePeople & { collection: string; item: object } =>
			typeof people.collection === 'string' && !!people.item && typeof people.item === 'object',
	),
);

</script>


<template>
	<Headline :headline="data.headline" />
	<div v-for="people in validPeople" :key="people.id" class="py-0">
		<Container>
			<BasePeople
					:people="people"
					:display="props.data.display"
					:show-country="props.data.show_country"
					:show-flag="props.data.show_flag"
					:show-title="props.data.show_title"
				/>
		</Container>
	</div>
</template>
