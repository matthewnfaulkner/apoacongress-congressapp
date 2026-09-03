<script setup lang="ts">
const config = useRuntimeConfig()
const auth = useAuthStore()

// Same object-vs-false idiom used elsewhere (e.g. useCheckoutEvent.ts's
// isMember) — the auth store's isAuthenticated is either `false` or the
// logged-in user object.
const isLoggedIn = computed(() => typeof auth.isAuthenticated === 'object')

const nationalRedirectUrl = config.public.checkoutNationalRedirectUrl as string | undefined

const loginPromptDismissed = ref(false)

// Only fetched at all when there's actually somewhere to redirect to — no
// point resolving geo-IP for a redirect that can't happen. Explicit geo
// headers forwarded here matter for SSR: Nitro's same-origin internal fetch
// doesn't automatically carry over the original inbound request's headers,
// so without this the server-rendered pass would never see the visitor's
// real country. A client-side fetch needs no such forwarding — it's a fresh
// request from the browser, tagged with a live geo header by the hosting
// edge just like the original page load was.
const { data: localityData } = await useFetch<{ locality: 'national' | 'international' }>('/api/checkout/locality', {
  key: 'checkout-locality',
  immediate: !!nationalRedirectUrl,
  headers: useRequestHeaders(['cf-ipcountry', 'x-vercel-ip-country', 'x-country']),
})

const REDIRECT_SECONDS = 8
const redirectSecondsLeft = ref(REDIRECT_SECONDS)
const redirectCancelled = ref(false)
let redirectInterval: ReturnType<typeof setInterval> | null = null

const showNationalRedirect = computed(
  () => !!nationalRedirectUrl && localityData.value?.locality === 'national' && !redirectCancelled.value,
)

function cancelRedirect() {
  redirectCancelled.value = true
  if (redirectInterval) clearInterval(redirectInterval)
}

watch(
  showNationalRedirect,
  (active) => {
    if (!active || redirectInterval) return
    redirectInterval = setInterval(() => {
      redirectSecondsLeft.value -= 1
      if (redirectSecondsLeft.value <= 0 && nationalRedirectUrl) {
        if (redirectInterval) clearInterval(redirectInterval)
        navigateTo(nationalRedirectUrl, { external: true })
      }
    }, 1000)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (redirectInterval) clearInterval(redirectInterval)
})
</script>

<template>

  <CheckoutStepPage step="registration" title="Choose from the Registration Packages" next-path="/checkout/addons" require-selection>
    <template #banner>
     <UAlert
        v-if="!isLoggedIn && !loginPromptDismissed"
        color="info"
        variant="subtle"
        icon="i-lucide-user"
        title="You're not logged in"
        close
        class="mb-6"
        @update:open="loginPromptDismissed = true"
      >
        <template #description>
          We recommend signing in to your APOA 2027 account. It will make managing your congress experience much easier.
          <NuxtLink to="/login?redirect=/checkout" class="text-accent underline">Click to Sign In</NuxtLink>.
        </template>
      </UAlert>
      <UAlert
        v-if="showNationalRedirect"
        color="info"
        variant="subtle"
        icon="i-lucide-map-pin"
        title="Redirecting to the local registration site"
        class="mb-6"
      >
        <template #description>
          It looks like you're registering from Taiwan. Redirecting you to the local registration site in
          {{ redirectSecondsLeft }} second{{ redirectSecondsLeft === 1 ? '' : 's' }}…
          <NuxtLink :to="nationalRedirectUrl!" class="text-accent underline">Go now</NuxtLink>, or
          <button type="button" class="text-accent underline" @click="cancelRedirect">stay on this page</button>.
        </template>
      </UAlert>
    </template>
  </CheckoutStepPage>
</template>
