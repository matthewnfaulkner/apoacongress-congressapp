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
	data: 'table';
}


const props = defineProps<ChargeTableRegistrationProps>();


const { data } = await useAsyncData <Congress>('registrationcharges', async() => {
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
						_eq: 'registration'
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

const tabs = ref();

const grouped: GroupedData = charges.reduce<GroupedData>((acc, item, index) => {
	const delegate = item.delegate || 'International';
	const category = item.sub_category || 'APOA Member';
	acc[delegate] ??= {
	}


	item.details?.forEach((detail) => {

		const registrationChargeDetail = detail as RegistrationChargeDetail;
		const header = `${registrationChargeDetail.cutoff_description} - ${dateStringToHumanStringBack(registrationChargeDetail.cutoff_date)}`;

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
</template>
