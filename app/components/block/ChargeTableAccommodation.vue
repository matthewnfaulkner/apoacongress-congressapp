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
	data: 'table' | 'cards'
}


const props = defineProps<ChargeTableAccommodationProps>();
const type = props.data;
const tabs = ref();
const { data } = await useAsyncData <Congress>('accommodationcharges', async() => {
      return await $directus.request<Congress>(readItem(
        'congress',
		congressId as string,
        {   
            fields: [
				'accommodation_charges'
			],          
        }
    ))}).finally(() => {
		loading.value = false
	})

if(!data.value) {
    console.log("No Events")  
}

const charges = data.value?.accommodation_charges || [];

if(type == 'table') {
	const grouped: GroupedData = charges.reduce<GroupedData>((acc, item, index) => {
	const delegate = item.delegate;
	const category = item.category;
	acc[delegate] ??= {
	};

	item.details.forEach((detail) => {

		const header = detail.category;
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
}


if(type === 'cards') {
	const grouped2: GroupedData = charges.reduce<GroupedData>((acc, item, index) => {
	const delegate = item.delegate as string;
	const category = item.category as string;
	acc[delegate] ??= {
	};
	
	if(item.details) {
		item.details.forEach((detail : AccomodationDetails) => {

			const detailCat = detail.category;
			const checkin = dateStringToHumanStringBack(detail.check_in);
			const checkout = dateStringToHumanStringBack(detail.check_out);
			const description = `${checkin} - ${checkout}`;
			acc[delegate][detailCat] ??= {
				price: detailCat,
				category: detailCat,
				description: description,
				hasPrice: false,
				features: [],
				button: {
					label: 'Register Now',
					color: 'accent',
					variant: 'solid'
				}
			};
			const feature = `${category} - ${item.price}`;
			acc[delegate][detailCat].features.push(feature)
		});
	}


	return acc;
	}, {})


	tabs.value = Object.entries(grouped2).map(([label, subObj]) => ({
		label,
		pricing_cards:  Object.values(subObj),
		button: {
			label: 'Register Now'
		}
	
	}));
}

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
	<div v-if="type == 'table'">
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
					:ui="{
						th: 'text-wrap bg-secondary-400 text-white',
						td: 'w-5'
					}"
				/>
			</template>
		</UTabs>
	</div>
	
	<Pricing v-else :data="{tabs: tabs}">

	</Pricing>
</template>
