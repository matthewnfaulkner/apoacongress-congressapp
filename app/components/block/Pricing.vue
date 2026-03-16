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

import { nextTick } from 'vue'

onMounted(async () => {
  await nextTick()

  window.dispatchEvent(
    new CustomEvent('directus:refresh')
  )
})

const onTabChange = async () => {
  await nextTick()
  // give Vue time to paint DOM
  requestAnimationFrame(() => {
    window.dispatchEvent(
      new CustomEvent('directus:refresh')
    )
  })
}
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

		<UTabs :items="data.tabs" color="accent" size="xl" class="mt-4" :unmountOnHide="false" @update:modelValue="onTabChange">
			<template #content="{item}">
				<PricingTab :tab="item"></PricingTab>
			</template>
		</UTabs>
	</section>
</template>
