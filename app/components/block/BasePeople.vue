<script setup lang="ts">
import PeopleCommittee from './PeopleCommittee.vue';
import PeopleList from './PeopleList.vue';

interface BasePeopleProps {
	display: string,
	showCountry?: boolean,
	showFlag?: boolean,
	showTitle?: boolean,
	people: {
		collection: string;
		item: any;
		id: string;
	};
}

const props = defineProps<BasePeopleProps>();

const components: Record<string, any> = {
	people_list: PeopleList,
	committee: PeopleCommittee
};

const Component = computed(() => components[props.people.collection]);
const componentData = computed(() => props.people.item);
</script>

<template>
	<div ref="blockRef" class="relative">
		<component
			:is="Component"
			v-if="Component"
			:id="`blockpeople-${people.id}`"
			:data="componentData"
			:display="props.display"
			:show-country="props.showCountry"
			:show-flag="props.showFlag"
			:show-title="props.showTitle"
		/>
	</div>
</template>
