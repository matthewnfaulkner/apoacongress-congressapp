<script setup lang="ts">
import { useSiteDataStore } from "~/stores/site-data";

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

const { isVisualEditingEnabled, apply } = useVisualEditing();

const navigation = useTemplateRef('navigationRef');
const footer = useTemplateRef('footerRef');



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

onMounted(() => {
	if (!isVisualEditingEnabled.value) return;
	apply({
		elements: [navigation.value?.navigationRef as HTMLElement, footer.value?.footerRef as HTMLElement],
		onSaved: () => {
			refresh();
		},
	});
});

</script>

<template>
	<div class="">
		<NuxtNavigationBar
			v-if="siteData?.headerNavigation[0]"
			ref="navigationRef"
			:navigation="siteData.headerNavigation[0]"
			:site="siteData.site"
		/>
		<NuxtPage class="min-h-lvh"/>
		<Footer
			v-if="siteData?.footerNavigation[0]"
			ref="footerRef"
			:navigation="siteData.footerNavigation[0]"
			:site="siteData.site"
			:organiser="(siteData.site.congress && siteData.site.congress.length > 0) ? siteData.site.congress[0]?.organiser : null"
		/>
	</div>
</template>
