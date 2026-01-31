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
		people: BlockPeoplePeople[]
	};
}

const components: Record<string, any> = {
	committee: PeopleCommittee,
	people_list: PeopleList
};

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
	<div v-for="people in validPeople" :key="people.id" class="py-0">
		<Container>
			<BasePeople :people="people" :display="props.data.display"/>
		</Container>
	</div>
</template>
