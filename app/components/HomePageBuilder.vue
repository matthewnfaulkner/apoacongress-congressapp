<script setup lang="ts">
interface HomePageBuilderProps {
	sections: PageBlock[];
}

const props = defineProps<HomePageBuilderProps>();

const validBlocks = computed(() =>
	props.sections.filter(
		(block): block is PageBlock & { collection: string; item: object } =>
			typeof block.collection === 'string' && !!block.item && typeof block.item === 'object',
	),
);
</script>

<template>
	<div v-for="block in validBlocks" :key="block.id" :data-background="block.background" class="mb-16">
		<BaseBlock v-if="block.collection == 'block_mainhero'" :block="block" />
		<Container v-else>
			<BaseBlock :block="block" />
		</Container>
	</div>
</template>
