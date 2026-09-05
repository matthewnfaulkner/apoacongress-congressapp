<script setup lang="ts">

const config = useRuntimeConfig();

const {
	data: siteData,
	error: siteError,
	refresh,
} = await useFetch('/api/site-data', {
	key: 'site-data',
	// Switching to/from the default layout unmounts this component, which
	// evicts Nuxt's payload cache for this key — fall back to the
	// static/prerendered payload instead of re-fetching from the server.
	...(!config.public.isSandbox
		? { getCachedData: (key: string, nuxtApp: any) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key] }
		: {}),
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
			innerHTML: `:root { --accent-color: ${unref(siteData)?.globals.accent_color || '#E41D21'} !important; }`,
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
	<div >
		<NuxtPage/>
	</div>
</template>
