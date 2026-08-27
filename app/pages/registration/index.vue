<script setup lang="ts">
import { readItems } from '@directus/sdk'
import type { FormFlow } from '~~/shared/types/schema'

const config = useRuntimeConfig()
const { $directus, $isAuthenticatedRegistration } = useNuxtApp()

const isAuthenticated = await $isAuthenticatedRegistration()

const { data: rawFlows } = await useAsyncData<FormFlow[]>('registration_flow', () =>
  $directus.request<FormFlow[]>(readItems('form_flows', {
    filter: {
      key:       { _eq: 'registration_' + config.public.siteId },
      site:      { _eq: config.public.siteId },
      is_active: { _eq: true },
    },
    fields: [
      'id', 'key', 'is_active', 'show_steps', 'title',
      'submit_label', 'success_message', 'success_redirect', 'show_summary', 'on_success', 'bot_protection',
      {
        steps: [
          'id', 'title', 'description', 'sort', 'advance_message',
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

interface SubmissionValueRow {
  id: string
  value?: string | null
  file?: { id: string; filename_download: string } | null
  field?: { name: string; label?: string | null; type?: string | null; choices?: { text: string; value: string }[] | null } | null
}

interface FormFlowSubmission {
  id: string
  values: SubmissionValueRow[]
}

const { data: rawSubmissions } = await useAsyncData<FormFlowSubmission[]>(
  'registration_submission',
  () => {
    if (!isAuthenticated || !flow.value) return Promise.resolve([])
    return $directus.request<FormFlowSubmission[]>(readItems('form_flow_submissions', {
      filter: {
        flow: { _eq: flow.value.id },
        user_created: { _eq: (isAuthenticated as any).id },
      },
      fields: [
        'id',
        {
          values: [
            'id', 'value',
            { file: ['id', 'filename_download'] },
            { field: ['name', 'label', 'type', 'choices'] },
          ],
        },
      ],
      limit: 1,
    }))
  },
  {
    watch: [flow],
    // The access token lives in localStorage (production/json auth mode),
    // which SSR can't see — isAuthenticated always resolves false there, so
    // this fetch must run client-side only, where auth state is real.
    server: false,
  }
)

const priorSubmission = computed(() => rawSubmissions.value?.[0] ?? null)
const resubmitting = ref(false)

function goToSuccessRedirect() {
  if (flow.value?.on_success === 'redirect' && flow.value?.success_redirect) {
    window.location.href = flow.value.success_redirect
  }
}

function resolveChoiceLabel(val: any, choices?: { text: string; value: string }[] | null): string {
  const match = choices?.find(c => c.value === val)
  return match ? match.text : String(val)
}

const submissionItems = computed(() => {
  if (!priorSubmission.value) return []
  return priorSubmission.value.values
    .filter(v => v.field && v.field.type !== 'hidden' && v.field.type !== 'voucher')
    .map(v => {
      const label = v.field?.label ?? v.field?.name ?? ''
      if (v.file) return { label, value: v.file.filename_download }
      if (v.value === undefined || v.value === null || v.value === '') return { label, value: '—' }
      if (v.field?.type === 'checkbox') return { label, value: (v.value === 'true') ? 'Yes' : 'No' }
      return { label, value: resolveChoiceLabel(v.value, v.field?.choices) }
    })
})

const registrationUrl = useRequestURL();
useSeoMeta({
	title: flow.value?.title ?? 'Registration',
	description: 'Register for APOA 2026 Taiwan.',
	ogTitle: flow.value?.title ?? 'Registration',
	ogDescription: 'Register for APOA 2026 Taiwan.',
	ogUrl: registrationUrl.toString(),
});

const route = useRoute()
const startStep = computed(() => route.query.step as string | undefined)
const continueFlow = computed(() => route.query.continue as string | undefined)

const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>

  <div v-if="!ready" />

  <UError
    v-else-if="!isAuthenticated && false"
    redirect="/login"
    :clear="{ color: 'neutral', size: 'xl', trailingIcon: 'i-lucide-arrow-right', class: 'rounded-full', label: 'Log In' }"
    :error="{ statusCode: 401, statusMessage: 'Sign In Required', message: 'You need to sign in to register.' }"
  />

  <div  class="my-8 px-4 max-w-2xl mx-auto min-h-dvh">
    <UAlert
      v-if="!flow"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Registration Unavailable"
      description="Registration is not currently open. Please check back later."
    />

    <template v-else-if="priorSubmission && !resubmitting">
      <Headline :headline="flow.title ?? flow.key" class="mb-4" />
      <UAlert
        color="accent"
        variant="subtle"
        icon="i-lucide-circle-check"
        title="You've already completed the pre-registration questionnaire."
        description="Here are your previous answers."
        class="mb-6"
      />
      <div class="divide-y divide-default">
        <div
          v-for="item in submissionItems"
          :key="item.label"
          class="flex justify-between items-center py-3 gap-4"
        >
          <span class="text-sm text-muted shrink-0">{{ item.label }}</span>
          <span class="text-sm font-medium text-right">{{ item.value }}</span>
        </div>
      </div>

      <div class="flex justify-between items-center pt-6 gap-4 mw-full">
        <UButton
          type="button"
          label="Change my Responses"
          color="neutral"
          variant="outline"
          size="xl"
          @click="() => { resubmitting = true }"
        />
        <UButton
          v-if="flow.on_success === 'redirect' && flow.success_redirect"
          type="button"
          label="Register"
          color="accent"
          variant="solid"
          size="xl"
          trailing-icon="i-lucide-arrow-right"
          @click="goToSuccessRedirect"
        />
      </div>
    </template>

    <template v-else>
      <Headline :headline="flow.title ?? flow.key" class="mb-4" />
      <FormFlowRunner :flow="flow" :start-step="startStep" :continue-flow="continueFlow" />
    </template>
  </div>
</template>
