<script setup lang="ts">
interface PricingProps {
	data: {
		id?: string;
		tagline?: string;
		headline?: string;
		tabs: Array<{
			id?: string;
			label?: string;
			pricing_cards: Array<{
				id: string;
				title: string;
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
		}>
	};
}
const { setAttr } = useVisualEditing();
defineProps<PricingProps>();
</script>

<template>
	<section>
		<Tagline
			v-if="data.tagline"
			:tagline="data.tagline"
			:data-directus="
				setAttr({
					collection: 'block_pricing',
					item: data.id,
					fields: 'tagline',
					mode: 'popover',
				})
			"
		/>
		<Headline
			v-if="data.headline"
			:headline="data.headline"
			:data-directus="
				setAttr({
					collection: 'block_pricing',
					item: data.id,
					fields: 'headline',
					mode: 'popover',
				})
			"
		/>

		<UTabs :items="data.tabs" color="accent" size="xl" class="mt-4">
			<template #content="{item}">
				<PricingTab :tab="item"></PricingTab>
			</template>
		</UTabs>
	</section>
</template>
