<script setup lang="ts">
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import { watch, ref } from 'vue';

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

const src = ref(getDirectusAssetURL(props.uuid));

watch(
	() => props.uuid,
	(newUuid) => {
		src.value = getDirectusAssetURL(newUuid);
	},
);
</script>

<template>
	<img :src="src" v-bind="{ ...props, uuid: undefined }" />
</template>
