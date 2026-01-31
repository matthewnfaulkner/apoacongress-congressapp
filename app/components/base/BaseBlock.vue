<script setup lang="ts">
import Hero from '~/components/block/Hero.vue';
import RichText from '~/components/block/RichText.vue';
import Gallery from '~/components/block/Gallery.vue';
import Pricing from '~/components/block/Pricing.vue';
import Posts from '~/components/block/Posts.vue';
import Form from '~/components/block/FormBlock.vue';
import People from '~/components/block/People.vue';
import MainHero from '~/components/block/MainHero.vue';
import Sponsors from '../block/Sponsors.vue';

interface BaseBlockProps {
	block: {
		collection: string;
		item: any;
		id: string;
	};
}

const props = defineProps<BaseBlockProps>();
const blockRef = ref<HTMLElement | null>(null);

const components: Record<string, any> = {
	block_hero: Hero,
	block_mainhero: MainHero,
	block_richtext: RichText,
	block_gallery: Gallery,
	block_pricing: Pricing,
	block_posts: Posts,
	block_form: Form,
	block_people: People,
	block_sponsors: Sponsors
};

const Component = computed(() => components[props.block.collection] || null);
const componentData = computed(() => props.block.item);
</script>

<template>
	<div ref="blockRef" class="relative">
		<component :is="Component" v-if="Component" :id="`block-${block.id}`" :data="componentData" />
	</div>
</template>
