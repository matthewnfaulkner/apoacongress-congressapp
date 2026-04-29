<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()

useHead({
	meta: [{ charset: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
	htmlAttrs: { lang: 'en' },
});


</script>

<template>
	<UApp :locale="locales[locale]">
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
		<CookieControl
			locale="en"
			:ui="{
				bar: 'bg-secondary'
			}"
		/>
		<ClientOnly>
			<PolicyConsentModal />
		</ClientOnly>
	</UApp>
</template>
