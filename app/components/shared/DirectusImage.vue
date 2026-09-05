<script setup lang="ts">
interface DirectusImageProps {
	uuid: DirectusFile | string | null | undefined;
	alt: string;
	width?: number;
	height?: number;
	[key: string]: any;
}

const props = withDefaults(defineProps<DirectusImageProps>(), {
	width: undefined,
	height: undefined,
});

const assetId = computed(() => {
	const { uuid } = props;
	if (!uuid) return '';
	return typeof uuid === 'string' ? uuid : uuid.id;
});
</script>

<template>
	<NuxtImg
		provider="directus"
		:src="assetId"
		:alt="alt"
		:width="width"
		:height="height"
		format="webp"
		:quality="80"
	/>
</template>
