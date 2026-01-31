<script setup lang="ts">
interface PricingTabProps {
	tab: {
		id?: string;
		tagline?: string;
		headline?: string;
		pricing_cards: Array<{
			id: string;
			label: string;
			description?: string;
			price?: string;
			badge?: string;
			features?: string[];
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
defineProps<PricingTabProps>();
</script>

<template>
		<div
			class="grid gap-6 mt-8"
			:class="{
				'grid-cols-1': tab.pricing_cards.length === 1,
				'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': tab.pricing_cards.length % 3 === 0,
				'grid-cols-1 sm:grid-cols-2': tab.pricing_cards.length % 3 !== 0 && tab.pricing_cards.length !== 1,
			}"
			:data-directus="
				setAttr({
					collection: 'block_pricing',
					item: tab.id,
					fields: ['pricing_cards'],
					mode: 'modal',
				})
			"
		>
			<PricingCard v-for="card in tab.pricing_cards" :key="card.id" :card="card" />
		</div>
</template>
