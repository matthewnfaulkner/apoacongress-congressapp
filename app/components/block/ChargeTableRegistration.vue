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


interface ChargeTableRegistrationProps {
	data: 'table' | 'cards'
}


const props = defineProps<ChargeTableRegistrationProps>();
const type = props.data;

const { data } = await useAsyncData <Congress>('registrationcharges', async() => {
      return await $directus.request<Congress>(readItem(
        'congress',
		congressId as string,
        {   
            fields: [
				'registration_charges'
			],          
        }
    ))}).finally(() => {
		loading.value = false
	})

if(!data.value) {
    console.log("No Events")  
}

const charges = data.value?.registration_charges || [];

const tabs = ref();

if(type == 'table') {
	const grouped: GroupedData = charges.reduce<GroupedData>((acc, item, index) => {
	const delegate = item.delegate;
	const category = item.category;
	acc[delegate] ??= {
	}

	item.cutoff.forEach((cutoff) => {

		const header = `${cutoff.name} - ${dateStringToHumanStringBack(cutoff.date)}`;
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


if(type == 'cards') {
	const grouped2: GroupedData = charges.reduce<GroupedData>((acc, item, index) => {
	const delegate = item.delegate as string;
	const category = item.category as string;
	acc[delegate] ??= {
	};
	
	if(item.cutoff) {
		item.cutoff.forEach((cutoff : Cutoff) => {

			const header = `${cutoff.name} ${dateStringToHumanStringBack(cutoff.date)}`;
			acc[delegate][category] ??= {
				title: category,
				category: category,
				price: item.price,
				description: header,
				features: [],
				hasPrice: false,
				button: {
					label: 'Register Now',
					color: 'accent',
					variant: 'solid'
				}
			};
			if(acc[delegate][category].hasPrice) {
					acc[delegate][category].features.push(item.price + " - " + header)

			}
			acc[delegate][category].hasPrice = true;
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


interface Cutoff {
  date: string;
  name: string;
}

interface RegistrationCharge {
  delegate: string;
  category: string;
  price: string;
  cutoff: Cutoff[];
}


type GroupedData = {
  [delegate: string]: {
    [date: string]: RegistrationCharge[];
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
