<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

/**
 * "Get a login link by email" — the guest alternative to logging in with an
 * account, shared by My orders and My registration. See
 * orders-access/request.post.ts (step one) and verify.get.ts (the link).
 *
 * `purpose` says which page the emailed link should open. It's sent now but
 * only takes effect once congress_access_tokens has a field to store it
 * (requested from the Directus session); until then every link opens
 * My orders.
 */
const props = defineProps<{
  heading: string
  emailDescription: string
  sentMessage: string
  /** Where "Log in" (account) should come back to. */
  loginRedirect: string
  purpose: 'orders' | 'registration'
}>()

const siteData = useSiteDataStore().siteData as Site
const congress = siteData.congress?.[0] as { id?: string } | string | undefined
const congressId = typeof congress === 'string' ? congress : congress?.id ?? null

const emailSchema = z.object({
  email: z.string().email('Invalid email'),
})
type EmailSchema = z.output<typeof emailSchema>
const emailState = reactive<Partial<EmailSchema>>({ email: undefined })
const requesting = ref(false)
const requestSent = ref(false)

const turnstileToken = ref<string>()
const turnstileRef = ref<{ reset: () => void } | null>(null)
const captchaError = ref<string | null>(null)

async function requestAccessLink(submitEvent: FormSubmitEvent<EmailSchema>) {
  if (!turnstileToken.value) {
    captchaError.value = 'Please complete the CAPTCHA before submitting.'
    return
  }
  captchaError.value = null

  requesting.value = true
  try {
    await $fetch('/api/checkout/orders-access/request', {
      method: 'POST',
      body: { email: submitEvent.data.email, congress: congressId, turnstileToken: turnstileToken.value, purpose: props.purpose },
    })
    requestSent.value = true
  } catch {
    // A Turnstile token is single-use, so a failed attempt needs a fresh one.
    turnstileToken.value = undefined
    turnstileRef.value?.reset()
  } finally {
    requesting.value = false
  }
}
</script>

<template>
  <UCard class="lg:w-[50%] m-auto h-full mt-30">
    <h1 class="text-2xl font-semibold text-foreground mb-6 font-heading">{{ heading }}</h1>

    <div v-if="requestSent" class="text-description text-lg">{{ sentMessage }}</div>
    <div v-else class="space-y-6">
      <UForm :schema="emailSchema" :state="emailState" class="space-y-4" @submit="requestAccessLink">
        <UFormField label="Email" name="email" :description="emailDescription" size="xl">
          <UInput v-model="emailState.email" class="w-80" />
        </UFormField>
        <div class="flex flex-col items-start gap-2">
          <NuxtTurnstile ref="turnstileRef" v-model="turnstileToken" />
          <p v-if="captchaError" class="text-sm text-red-500">{{ captchaError }}</p>
        </div>
        <UButton color="accent" size="xl" type="submit" :loading="requesting" label="Send me a link" />
      </UForm>

      <p class="text-description text-sm">
        Have an account? <NuxtLink :to="`/login?redirect=${loginRedirect}`" class="text-accent underline">Log in</NuxtLink> instead.
      </p>
    </div>
  </UCard>
</template>
