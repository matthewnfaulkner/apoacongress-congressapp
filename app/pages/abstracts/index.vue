<script setup lang="ts">
import { container } from '#build/ui';
import type { Page, PageBlock } from '#shared/types/schema';
import { withLeadingSlash, withoutTrailingSlash } from 'ufo';

const route = useRoute();
const { enabled, state } = useLivePreview();
const pageUrl = useRequestURL();

const localePath = useLocalePath();

const permalink = '/abstracts'

const auth = await useAuthStore();

const isLoggedIn = computed(() =>
  auth.isAuthenticated !== false
)

// Handle Live Preview adding version=main which is not required when fetching the main version.
const version = route.query.version === 'main' ? undefined : (route.query.version as string);

const {
	data: page,
	error,
	refresh,
} = await useFetch<Page>('/api/pages/one', {
	key: `pages-${permalink}`,
	query: {
		permalink,
		preview: enabled.value ? true : undefined,
		token: enabled.value ? state.token : undefined,
		id: route.query.id as string,
		version,
	},
});

if (!page.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true });
}

const pageBlocks = computed(() => (page.value?.blocks as PageBlock[]) || []);

useSeoMeta({
	title: page.value?.seo?.title || page.value?.title || '',
	description: page.value?.seo?.meta_description || '',
	ogTitle: page.value?.seo?.title || page.value?.title || '',
	ogDescription: page.value?.seo?.meta_description || '',
	ogUrl: pageUrl.toString(),
});
</script>

<template>
	<div class="relative my-5">
		<PageBuilder v-if="pageBlocks" :sections="pageBlocks" />
        <section>
            <div  class="text-center">
                <UButton v-if="isLoggedIn" :to="localePath('/abstracts/submission')" label="Go to Abstract Submission" variant="solid" color="accent" size="xl"/>
                <UButton v-else to="/login"  label="Please Log in to submit" variant="solid" color="accent" size="xl"/>
            </div>
        </section>
        
	</div>
</template>

<style>
.directus-visual-editing-overlay.visual-editing-button-class .directus-visual-editing-edit-button {
	/* Not using style scoped because the visual editor adds it's own elements to the page. Safe to remove this if you're not using the visual editor. */
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	transform: none;
	background: transparent;
}
</style>
