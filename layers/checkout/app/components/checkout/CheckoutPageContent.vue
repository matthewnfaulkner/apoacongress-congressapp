<script setup lang="ts">
import type { Page, PageBlock } from '#shared/types/schema';

const props = defineProps<{
	permalink: string;
}>();

const { data: page, status } = await useFetch<Page>('/api/pages/one', {
	key: computed(() => `pages-${props.permalink}`),
	query: { permalink: props.permalink },
});

const pageBlocks = computed(() => (page.value?.blocks as PageBlock[]) || []);
</script>

<template>
	<div>
		<UAlert
			v-if="status === 'error' || (status === 'success' && !page)"
			color="error"
			title="Unable to load this page"
		/>
		<PageBuilder v-else :sections="pageBlocks" />
	</div>
</template>
