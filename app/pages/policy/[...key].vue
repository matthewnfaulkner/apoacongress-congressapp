<script setup lang="ts">
import type { Policy } from '#shared/types/schema';

const route = useRoute();
const key = computed(() => (Array.isArray(route.params.key) ? route.params.key.join('/') : route.params.key));

const { data, error } = await useFetch<{ policy: Policy }>('/api/policies/one', {
	key: computed(() => `policy-${key.value}`),
	query: { key },
	headers: useRequestHeaders(['cookie']),
	getCachedData: (cacheKey, nuxtApp) => nuxtApp.payload.data[cacheKey] ?? nuxtApp.static.data[cacheKey],
});

if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Policy not found', fatal: true });
}

const policy = computed(() => data.value?.policy);

useSeoMeta({
	title: policy.value?.name || 'Policy',
	description: policy.value?.notification || undefined,
});
</script>

<template>
	<Container class="py-12 max-w-4xl">
		<Headline :headline="policy?.name || 'Policy'" as="h1" class="mb-4" />

		<p v-if="policy?.date_updated" class="text-sm text-gray-500 mb-8">
			Last updated {{ new Date(policy.date_updated).toLocaleDateString() }}
		</p>

		<Separator class="h-[1px] bg-gray-300 mb-8" />

		<main>
			<Text :content="policy?.content || ''" />
		</main>
	</Container>
</template>
