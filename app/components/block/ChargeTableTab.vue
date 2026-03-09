<script setup lang="ts">
const loading = ref(true);

interface ChargeTableTabProps {
	tab: {
		id?: string;
		label?: string;
		type?: 'table' | 'cards';
		cards: Array<{
			id: string;
			title: string;
			description?: string;
			price?: string;
			badge?: string;
			features?: string[];
			congress_charges: CongressCharge[];
			button?: {
				id: string;
				label: string | null;
				variant: string | null;
				url: string | null;
			};
			is_highlighted?: boolean;
		}>;
	};
}
const { setAttr } = useVisualEditing();
defineProps<ChargeTableTabProps>();


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
	
</script>

<template>
		
		<div 
			v-if="tab.type == 'cards'"
			class="grid gap-6 mt-8"
			:class="{
				'grid-cols-1': tab.cards.length === 1,
				'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': tab.cards.length % 3 === 0,
				'grid-cols-1 sm:grid-cols-2': tab.cards.length % 3 !== 0 && tab.cards.length !== 1,
			}"
			:data-directus="
				setAttr({
					collection: 'block_chargetable',
					item: tab.id,
					fields: ['cards'],
					mode: 'modal',
				})
			"
		>
			<ChargeTableCard v-for="card in tab.cards" :key="card.id" :card="card" :type="category"/>
		</div>
		<div v-else-if="tab.type == 'table'">
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
		</div>
</template>
