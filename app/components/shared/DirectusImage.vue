<script setup lang="ts">
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

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

// Directus refuses to transform (format/quality/resize) source images above
// its own internal safety threshold — a plain camera-original that's, say,
// 40+ megapixels 400s on `?format=webp` instead of serving anything. Rather
// than showing a broken image for those, fall back to the untransformed
// original on load failure.
const transformFailed = ref(false);

watch(assetId, () => {
	transformFailed.value = false;
});
</script>

<template>
	<img
		v-if="transformFailed"
		:src="getDirectusAssetURL(uuid)"
		:alt="alt"
		:width="width"
		:height="height"
	/>
	<NuxtImg
		v-else
		provider="directus"
		:src="assetId"
		:alt="alt"
		:width="width"
		:height="height"
		format="webp"
		:quality="70"
		@error="transformFailed = true"
	/>
</template>
