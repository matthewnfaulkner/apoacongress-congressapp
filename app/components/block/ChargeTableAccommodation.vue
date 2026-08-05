<script setup lang="ts">
import type { DirectusFile } from '@directus/sdk';
import  ButtonGroup  from '@/components/base/ButtonGroup.vue';
import { dateStringToHumanStringBack } from '~/utils/time-utils';
import { readItem } from '@directus/sdk';
import PricingCard from './PricingCard.vue';

const { $directus } = useNuxtApp();

const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.siteData as Site;
const congress = siteData.congress ? siteData.congress[0] : null;
const congressId = congress?.id;
const loading = ref(true);
const activeTab = ref('0');


interface ChargeTableAccommodationProps {
	data: 'table'
}

const props = defineProps<ChargeTableAccommodationProps>();
const tabs = ref();

const { data } = await useAsyncData <Congress>('accommodationcharges', async() => {
      return await $directus.request<Congress>(readItem(
        'congress',
		congressId as string,
        {   
            fields: [
				{
					'charges': [
						'*'
					]
				}
			],      
			deep: {
				charges: {
					_filter: {
					category: {
						_eq: 'accommodation'
						}
					}
				}
				}
        }
    ))}).finally(() => {
		loading.value = false
	})

if(!data.value) {
    console.log("No Events")  
}

const charges = data.value?.charges as CongressCharge[] || [];

const grouped: GroupedData = charges.reduce<GroupedData>((acc, item, index) => {
	const delegate = item.delegate || 'International';
	const category = item.sub_category;
	
	acc[delegate] ??= {
	};

	item.details?.forEach((detail) => {

		const acccommodationChargeDetail = detail as AccommodationChargeDetail;
		const header = acccommodationChargeDetail.stay_length
		acc[delegate][category] ??= {
			category: category
		};
		acc[delegate][category][header] = item.price
	});



	return acc;
}, {})


tabs.value = Object.entries(grouped).map(([label, subObj]) => ({
	label,
	items: Object.values(subObj),
}));



interface AccomodationDetails {
	category: string,
	check_in: string,
	check_out: string
}

interface AccomodationCharge {
  delegate: string;
  category: string;
  price: string;
  details: AccomodationDetails[]
}

type GroupedData = {
  [delegate: string]: {
    [stay: string]: AccomodationCharge[];
  };
};


</script>


<template>
	<UProgress v-if="loading"></UProgress>
	<UTabs
		v-else
		:items="tabs"
		labelKey="label"
		color="accent"
		v-model="activeTab"
		>
		<template #content="{ item }">
			<UTable 
				:data="item.items"
				:meta="{
					class: {
						tr: (row) => 
							'text-wrap'
					},
				}"
				:ui="{
					th: 'text-wrap bg-secondary-400 text-white',
					td: 'w-5 max-w-5 text-wrap whitespace-normal',
					tr: 'text-wrap'
				}"
			/>
		</template>
	</UTabs>
</template>
