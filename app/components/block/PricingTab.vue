<script setup lang="ts">
interface PricingTabProps {
	tab: {
		id?: string;
		tagline?: string;
		headline?: string;
		pricing_cards: Array<{
			id: string;
			title: string;
			label: string;
			description?: string;
			price?: string;
			badge?: Array<{ label: string; link?: string }> | null;
			features?: string[];
			sort?: number;
			button_group?: {
				buttons: Array<{
					id: string;
					label: string | null;
					variant: string | null;
					url: string | null;
					type: 'url' | 'page' | 'post';
					pagePermalink?: string | null;
					postSlug?: string | null;
				}>;
			};
			is_highlighted?: boolean;
		}>;
	};
}
const { setAttr } = useVisualEditing();
const props = defineProps<PricingTabProps>();

const sortedCards = computed(() =>
	[...props.tab.pricing_cards].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
)
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
					collection: 'block_pricing_tabs',
					item: tab.id as string,
					fields: ['label', 'pricing_cards'],
					mode: 'modal',
				})
			"
		>	
			<PricingCard v-for="card in sortedCards" :key="card.id" :card="card" ></PricingCard>
		</div>
</template>
