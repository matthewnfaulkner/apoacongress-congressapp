<script setup lang="ts">
import type { Policy } from '#shared/types/schema';

const { data, error } = await useFetch<{ policy: Policy }>('/api/policies/privacy', {
	key: 'privacy-policy',
	headers: useRequestHeaders(['cookie']),
	getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
});

if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Privacy policy not found', fatal: true });
}

const policy = computed(() => data.value?.policy);

useSeoMeta({
	title: policy.value?.name || 'Privacy Policy',
	description: 'Our privacy policy',
});
</script>

<template>
	<Container class="py-12 max-w-4xl">
		<Headline :headline="policy?.name || 'Privacy Policy'" as="h1" class="mb-4" />

		<p v-if="policy?.date_updated" class="text-sm text-gray-500 mb-8">
			Last updated {{ new Date(policy.date_updated).toLocaleDateString() }}
		</p>

		<Separator class="h-[1px] bg-gray-300 mb-8" />

		<main>
			<Text :content="policy?.content || ''" />
		</main>
	</Container>
</template>
