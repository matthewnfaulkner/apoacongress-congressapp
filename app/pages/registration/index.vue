<script setup lang="ts">
import { readItems } from '@directus/sdk'
import type { FormFlow } from '~~/shared/types/schema'

const config = useRuntimeConfig()
const { $directus, $isAuthenticated } = useNuxtApp()

const isAuthenticated = await $isAuthenticated()

const { data: rawFlows } = await useAsyncData<FormFlow[]>('registration_flow', () =>
  $directus.request<FormFlow[]>(readItems('form_flows', {
    filter: {
      key:       { _eq: 'registration' },
      site:      { _eq: config.public.siteId },
      is_active: { _eq: true },
    },
    fields: [
      'id', 'key', 'is_active', 'show_steps', 'title',
      'submit_label', 'success_message', 'success_redirect',
      {
        steps: [
          'id', 'title', 'description', 'sort',
          {
            fields: [
              'id', 'name', 'type', 'copy', 'label', 'placeholder',
              'help', 'validation', 'width', 'choices',
              'required', 'sort', 'use_user_data', 'readonly'
            ],
          },
          {
            conditions: [
              'id', 'logical_operator', 'next_step',
              {
                rules: [
                  'id', 'operator', 'value',
                  { field: ['id', 'name'] },
                ],
              },
            ],
          },
        ],
      },
    ],
    limit: 1,
  }))
)

const flow = computed(() => rawFlows.value?.[0] ?? null)

const registrationUrl = useRequestURL();
useSeoMeta({
	title: flow.value?.title ?? 'Registration',
	description: 'Register for APOA 2026 Taiwan.',
	ogTitle: flow.value?.title ?? 'Registration',
	ogDescription: 'Register for APOA 2026 Taiwan.',
	ogUrl: registrationUrl.toString(),
});

const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <div v-if="!ready" />

  <UError
    v-else-if="!isAuthenticated"
    redirect="/login"
    :clear="{ color: 'neutral', size: 'xl', trailingIcon: 'i-lucide-arrow-right', class: 'rounded-full', label: 'Log In' }"
    :error="{ statusCode: 401, statusMessage: 'Sign In Required', message: 'You need to sign in to register.' }"
  />

  <div v-else class="my-8 px-4 max-w-2xl mx-auto">
    <UAlert
      v-if="!flow"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Registration Unavailable"
      description="Registration is not currently open. Please check back later."
    />

    <template v-else>
      <Headline :headline="flow.title ?? flow.key" class="mb-4" />
      <FormFlowRunner :flow="flow" />
    </template>
  </div>
</template>
