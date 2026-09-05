<script setup lang="ts">
import { useSiteDataStore } from "~/stores/site-data";
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import Assistant from "~/components/ui/chat/Assistant.vue";
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';

const { isLoading } = useLoadingIndicator()
const pageReady = ref(false)
onMounted(async() => {setTimeout(() => {pageReady.value = true}, 100)})

// Total visibility logic
const showContent = computed(() =>  pageReady.value && !isLoading.value)

const config = useRuntimeConfig();

const {
	data: siteData,
	error: siteError,
	refresh,
} = await useFetch('/api/site-data', {
	key: 'site-data',
	// Switching to/from the login layout unmounts this component, which evicts
	// Nuxt's payload cache for this key — fall back to the static/prerendered
	// payload instead of re-fetching from the server.
	...(!config.public.isSandbox
		? { getCachedData: (key: string, nuxtApp: any) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key] }
		: {}),
});

if (siteError.value) {
	const toast = useToast();
	toast.add({
		title: 'Unable to reach the server',
		description: 'The server could not be reached. It may be temporarily down — please try again shortly.',
		icon: 'i-lucide-server-crash',
		color: 'error',
	});
	throw createError({
		statusCode: 500,
		statusMessage: 'Failed to load site data. Please try again later.',
		fatal: true,
	});
}

const siteDataStore = useSiteDataStore();
siteDataStore.setSiteData(unref(siteData)?.site as Site);
siteDataStore.setScientificTags(unref(siteData)?.scientific_tags ?? []);


const auth = await useAuthStore();

const { isVisualEditingEnabled, apply } = useVisualEditing();

const navigation = useTemplateRef('navigationRef');
const footer = useTemplateRef('footerRef');

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
	link: [{ rel: 'icon', href: siteData.value?.site.favicon ? getDirectusAssetURL(siteData.value?.site.favicon) : '/favicon.png' }],
});

useSeoMeta({
	titleTemplate: `%s / ${unref(siteData)?.site.title}`,
	ogSiteName: unref(siteData)?.site.title,
});

const open = ref(false)

onMounted(() => {
	open.value = true;
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
	<UError  
		v-if="siteError" :error="{
			statusCode: 404,
			statusMessage: 'Error',
			message: 'We are unable to complete your request, please try again later.'
			}">
			<template #links><div></div></template>
	</UError>
	<div v-else-if="siteData?.site.preview && false">
		<NuxtPage/>
	</div>
	<div  v-else>
		<NuxtNavigationBar
			v-if="siteData?.headerNavigation[0]"
			ref="navigationRef"
			:navigation="siteData.headerNavigation[0]"
			:site="siteData.site"
		/>
		<div v-if="!showContent" class="flex items-center justify-center h-screen">
          <UProgress class="w-80" color="accent"/>
        </div>
		<div v-show="showContent">
			<UAlert v-if="siteData?.site.preview " title="This site is in Preview Mode" color="accent" class="rounded-none"></UAlert>
			<NuxtPage class="min-h-lvh text-left justify-start" />
			<ClientOnly>
				<Assistant v-if="auth.isAuthenticated"/>
				<PolicyConsentModal v-if="showContent" />
			</ClientOnly>
		</div>
		<Footer
			v-if="siteData?.footerNavigation[0]"
			ref="footerRef"
			:navigation="siteData.footerNavigation[0]"
			:site="siteData.site"
			:organiser="(siteData.site.congress && siteData.site.congress.length > 0) ? siteData.site.congress[0]?.organiser : null"
		/>
	</div>
</template>
