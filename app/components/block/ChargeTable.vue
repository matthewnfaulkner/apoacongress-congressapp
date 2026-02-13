<script setup lang="ts">
import type { DirectusFile } from '@directus/sdk';
import  ButtonGroup  from '@/components/base/ButtonGroup.vue';
import { dateStringToHumanStringBack } from '~/utils/time-utils';
import { readItem } from '@directus/sdk';
import PricingCard from './PricingCard.vue';
import ChargeTableAccomodation from './ChargeTableAccomodation.vue';
import ChargeTableRegistration from './ChargeTableRegistration.vue';


interface ChargeTableProps {
	data: {
		id: string;
		headline: string,
		type: 'table' | 'cards'
		category: 'congress' | 'accomodation'
	};
}


const props = defineProps<ChargeTableProps>();
const headline = props.data.headline;
const type = props.data.type;
const category = props.data.category;

const components: Record<string, any> = {
	accomodation: ChargeTableAccomodation,
	congress: ChargeTableRegistration
}

const Component = computed(() => components[category] || null);
const componentData = computed(() => type);

</script>


<template>
	<Headline :headline="headline" />
	<div ref="blockRef" class="relative">
		<component :is="Component" v-if="Component" :id="`block-${data.id}`" :data="componentData" />
	</div>
</template>
