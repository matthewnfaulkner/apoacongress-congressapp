<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()

useHead({
	meta: [{ charset: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
	htmlAttrs: { lang: 'en' },
});

const pageLoaded = ref(false)

onMounted(() => {
	const show = () => setTimeout(() => { pageLoaded.value = true }, 1500)
	if (document.readyState === 'complete') {
		show()
	} else {
		window.addEventListener('load', show, { once: true })
	}
})
</script>

<template>
	<UApp :locale="locales[locale]">
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
		<ClientOnly>
			<CookieControl
				v-if="pageLoaded"
				locale="en"
				:ui="{
					bar: 'bg-secondary',
					
					
				}"
			>

		</CookieControl>
			<PolicyConsentModal />
		</ClientOnly>
	</UApp>
</template>
