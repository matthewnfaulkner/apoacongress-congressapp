<script setup lang="ts">

import ChargeTableAccommodation from './ChargeTableAccommodation.vue';
import ChargeTableRegistration from './ChargeTableRegistration.vue';


interface ChargeTableProps {
	data: {
		id: string;
		headline: string,
		type: 'table' | 'cards'
		category: 'congress' | 'accommodation'
	};
}


const props = defineProps<ChargeTableProps>();
const headline = props.data.headline;
const type = props.data.type;
const category = props.data.category;

const components: Record<string, any> = {
	accommodation: ChargeTableAccommodation,
	congress: ChargeTableRegistration
}

const Component = computed(() => components[category] || null);
const componentData = computed(() => type);

</script>


<template>
	<Headline :headline="headline" />
	{{ data }}
	<div ref="blockRef" class="relative">
		<component :is="Component" v-if="Component" :id="`block-${data.id}`" :data="componentData" />
	</div>
</template>
