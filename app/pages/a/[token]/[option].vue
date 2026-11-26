<script setup lang="ts">
definePageMeta({
  layout: 'login',
})

// Landing page for decision links in emails. Loading it changes nothing (mail
// scanners prefetch every link) - the decision is only recorded by the POST
// below, which runs once the page is open in a real browser.
const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.siteData;

const route = useRoute();
const token = route.params.token as string;
const option = route.params.option as string;

const state = ref<'pending' | 'success' | 'error'>('pending');
const message = ref('');

onMounted(async () => {
  try {
    const result = await $fetch<{ ok: boolean; message: string }>(
      `/api/decisions/${encodeURIComponent(token)}/${encodeURIComponent(option)}`,
      { method: 'POST' },
    );
    message.value = result.message;
    state.value = 'success';
  } catch (error: any) {
    message.value = error?.data?.data?.message || 'Sorry, we couldn\'t record your response. Please try again later.';
    state.value = 'error';
  }
});

useSeoMeta({ title: 'Your Response', robots: 'noindex, nofollow' });
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4 h-lvh">
    <UPageCard class="w-full max-w-md">
      <template #header>
        <UUser
          :name="siteData?.title"
          class="m-auto w-100 text-center"
          size="3xl"
          orientation="vertical"
        >
          <template #avatar>
            <DirectusImage :uuid="siteData?.logo" class="h-25 w-25 m-auto"/>
          </template>
        </UUser>
      </template>

      <div class="flex flex-col items-center gap-3 text-center">
        <template v-if="state === 'pending'">
          <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-muted" />
          <p>Recording your response…</p>
        </template>
        <template v-else>
          <UIcon
            :name="state === 'success' ? 'i-lucide-circle-check' : 'i-lucide-circle-alert'"
            :class="['size-10', state === 'success' ? 'text-success' : 'text-error']"
          />
          <!-- Plain text interpolation only - messages come from Directus and must never render as HTML. -->
          <p class="whitespace-pre-line">{{ message }}</p>
        </template>
      </div>
    </UPageCard>
  </div>
</template>
