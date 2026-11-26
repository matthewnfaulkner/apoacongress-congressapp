<script setup lang="ts">
definePageMeta({
	layout: 'login',
})

const siteDataStore = useSiteDataStore()
const site = computed(() => siteDataStore.siteData as Site)

useSeoMeta({
	title: 'Down for maintenance',
	robots: 'noindex, nofollow',
})
</script>

<template>
	<div class="flex min-h-[60vh] items-center justify-center px-4 py-16">
		<div class="max-w-2xl text-center">
			<p class="text-xl md:text-5xl font-heading text-secondary mb-6">
				*Down for maintenance*
			</p>
			<div
				v-if="site?.maintenance_message"
				class="prose dark:prose-invert max-w-none text-lg mx-auto"
				v-html="site.maintenance_message"
			/>
		</div>
	</div>
</template>
