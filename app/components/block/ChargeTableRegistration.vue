<script setup lang="ts">
import type { DirectusFile } from '@directus/sdk';
import  ButtonGroup  from '@/components/base/ButtonGroup.vue';
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
						'*',
						{ pricing_period: ['name', 'starts_on', 'ends_on', 'sort'] }
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

// One column per price window (pricing period, or the old details cutoff),
// in period order.
const headersByDelegate: Record<string, Array<{ label: string; sort: number }>> = {};
charges.forEach(item => {
	const delegate = item.delegate || 'International';
	const headers = (headersByDelegate[delegate] ??= []);
	const window = chargePriceWindow(item);
	if (window && !headers.some(header => header.label === window.label)) {
		headers.push({ label: window.label, sort: window.sort });
	}
});
Object.values(headersByDelegate).forEach(headers => headers.sort((a, b) => a.sort - b.sort));

// A charge with no window applies in every column.
const prices: Record<string, Record<string, Record<string, string | null | undefined>>> = {};
charges.forEach(item => {
	const delegate = item.delegate || 'International';
	const category = item.sub_category || 'APOA Member';
	const row = ((prices[delegate] ??= {})[category] ??= {});
	const window = chargePriceWindow(item);
	const labels = window ? [window.label] : (headersByDelegate[delegate] ?? []).map(header => header.label);
	labels.forEach(label => {
		row[label] = item.price;
	});
});

// Rows built in column order, since the table takes its columns from the keys.
const grouped: GroupedData = {};
Object.entries(prices).forEach(([delegate, categories]) => {
	const rows: GroupedData[string] = (grouped[delegate] = {});
	Object.entries(categories).forEach(([category, byLabel]) => {
		const row: CategoryRow = { category };
		(headersByDelegate[delegate] ?? []).forEach(({ label }) => {
			row[label] = byLabel[label] ?? null;
		});
		rows[category] = row;
	});
});


tabs.value = Object.entries(grouped).map(([label, subObj]) => ({
label,
items: Object.values(subObj),
}));




type CategoryRow = {
  category: string;
  [header: string]: string | null | undefined;
};

type GroupedData = {
  [delegate: string]: {
    [subCategory: string]: CategoryRow;
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
