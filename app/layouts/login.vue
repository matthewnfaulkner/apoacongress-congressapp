<script setup lang="ts">
const {
	data: siteData,
	error: siteError,
	refresh,
} = await useFetch('/api/site-data', {
	key: 'site-data',
});



if (siteError.value) {
	throw createError({
		statusCode: 500,
		statusMessage: 'Failed to load site data. Please try again later.',
		fatal: true,
	});
}


const siteDataStore = useSiteDataStore();
siteDataStore.setSiteData(unref(siteData)?.site as Site);

useHead({
	style: [
		{
			id: 'accent-color',
			innerHTML: `:root { --accent-color: ${unref(siteData)?.globals.accent_color || '#6644ff'} !important; }`,
		},
	],
	bodyAttrs: {
		class: 'antialiased font-sans',
	},
});

useSeoMeta({
	titleTemplate: `%s / ${unref(siteData)?.globals.title}`,
	ogSiteName: unref(siteData)?.globals.title,
});

</script>

<template>
	<div class="">
		<NuxtPage/>
	</div>
</template>
