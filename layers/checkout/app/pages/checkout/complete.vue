<script setup lang="ts">
import type { Form, FormField, Site } from '#shared/types/schema'
import type { CreateBundleResponse } from '../../types/checkout'
import type FormBuilder from '~/components/forms/FormBuilder.vue'

const { data: checkoutEvent } = useCheckoutEvent()
const { store, isEmpty } = useCheckoutBasket()
const { $directusTokenStorage } = useNuxtApp()
const { orderId } = useCheckoutAddOn()
const auth = useAuthStore()
const siteDataStore = useSiteDataStore()

// Attached to the congress_order_owners claim (see bundle.post.ts) for
// traceability - already loaded here from the initial page load's site-data
// fetch (Site.congress), so no need for bundle.post.ts to re-resolve it
// itself with a second Directus round-trip.
const congressId = computed(() => {
  const congress = (siteDataStore.siteData as Site).congress?.[0]
  return (typeof congress === 'object' ? congress?.id : congress) ?? null
})

// Same object-vs-false idiom used elsewhere (e.g. useCheckoutEvent.ts's
// isMember) — the auth store's isAuthenticated is either `false` or the
// logged-in user object.
const isLoggedIn = computed(() => typeof auth.isAuthenticated === 'object')

// Checkbox only shown to logged-in customers — where this actually gets
// saved to is still to be wired up.
const saveDetails = ref(false)

// Form (Directus sites.checkout_form) shown alongside the basket — e.g.
// dietary requirements, accessibility needs. Its own submission (via
// FormBuilder -> /api/forms/submit) is independent of the basket/bundle/
// payment flow, but a site with no checkout_form configured at all is
// treated as a configuration error, not "nothing more to collect" — see
// checkoutUnavailable below, which stays true until a real form comes back.
const { data: checkoutForm, status: checkoutFormStatus } = useFetch<(Form & { fields: FormField[] }) | null>('/api/checkout/checkout-form', {
  key: 'checkout-form',
})

// Watches status rather than checkoutForm itself — the API can legitimately
// resolve to null (no checkout_form configured), which wouldn't register as
// a change if watched directly since the ref's value never actually differs.
// immediate: true matters here — on a hard refresh, useFetch resolves during
// SSR, so the client hydrates with status already at 'success' before this
// watch is even set up; without immediate, that transition is missed and
// checkoutFormFetched would never flip.
const checkoutFormFetched = ref(false)
watch(checkoutFormStatus, (status) => {
  if (status === 'success' || status === 'error') checkoutFormFetched.value = true
}, { immediate: true })

const creating = ref(false)
const createError = ref<string | null>(null)
const formBuilderRef = ref<InstanceType<typeof FormBuilder> | null>(null)

// Polled (cached server-side, see checkTicketTailorHealth) so a Ticket
// Tailor outage shows up here — before the customer fills out the whole
// form — rather than only surfacing once proceedToPayment's own bundle.post.ts
// call fails.
const { data: health } = useFetch<{ available: boolean }>('/api/checkout/health', { key: 'checkout-health' })
// Also unavailable whenever checkoutForm isn't a real form yet — either
// still fetching, or fetched and genuinely absent (no checkout_form
// configured for this site). Both cases render the same "unavailable" state
// below rather than letting checkout proceed with no form to submit.
const checkoutUnavailable = computed(() => health.value?.available === false || !checkoutForm.value)

// Bundle creation happens here, between the review step and the payment
// step — not automatically on mount. An existing bundle (basket unchanged
// since it was made) is reused rather than recreated.
async function proceedToPayment() {
  if (checkoutUnavailable.value) return

  creating.value = true
  createError.value = null

  try {
    // One button doing double duty: submits the optional checkout_form
    // (its own submit button is hidden — see :show-submit-button below)
    // before creating the bundle. A failed/invalid form submission stops
    // here — FormBuilder already shows the validation/error state itself.
    if (checkoutForm.value) {
      const submitted = await formBuilderRef.value?.submit()
      if (!submitted) {
        creating.value = false
        return
      }
    }

    if (!store.bundle) {
      // Production auth is json/localStorage-based (see app/plugins/
      // directus.ts) — a plain fetch to our own backend doesn't carry that
      // automatically, so the access token is attached explicitly here.
      // Sandbox mode just ignores this and uses its session cookie instead.
      const accessToken = $directusTokenStorage.get()?.access_token as string | undefined

      const { bundle, guestToken } = await $fetch<CreateBundleResponse>('/api/checkout/bundle', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          lines: store.lines,
          locality: store.localityOverride,
          orderId: orderId.value,
          formSubmissionId: formBuilderRef.value?.lastSubmissionId ?? null,
          congressId: congressId.value,
        },
      })
      store.setBundle(bundle)
      store.setGuestOrderToken(guestToken)
    }
    await navigateTo(checkoutStepLink('/checkout/payment', orderId.value))
  } catch (err: any) {
    createError.value = err?.data?.statusMessage ?? 'Could not start checkout. Please review your basket and try again.'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <Container class="my-8">
    <CheckoutStepper />
    <h1 class="text-2xl font-semibold text-foreground lg:mt-12 text-center font-heading">Review Selection</h1>

    <CheckoutAddOnBanner :order-id="orderId" />

    <div v-if="isEmpty" class="text-description">
      Your basket is empty. <NuxtLink :to="checkoutStepLink('/checkout', orderId)" class="text-accent underline">Start your registration</NuxtLink>.
    </div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto items-start">
        <div>
          <h3  class="text-3xl font-heading">Your Details</h3>
          <USkeleton v-if="!checkoutFormFetched" v-for=" i in Array.from({ length: 10 })" class="w-full h-11 my-4"/>
          <FormBuilder
            v-else-if="checkoutForm"
            ref="formBuilderRef"
            :form="checkoutForm"
            :bordered="false"
            :show-submit-button="false"
            :persisted-values="store.checkoutFormValues"
            :on-values-change="store.setCheckoutFormValues"
          />
          <p v-else class="text-error text-sm">Checkout is not available — please try again later.</p>

          <div v-if="checkoutForm && isLoggedIn && false" class="mt-5">
            <UCheckbox v-model="saveDetails" label="Save my details for next time" color="neutral" size="xl" :ui="{base: ' ring-neutral'}"/>

          </div>
        </div>
        

        <div class="text-center">
          <CheckoutBasketSummary :checkout-event="checkoutEvent" />

          <p v-if="checkoutUnavailable" class="text-error text-sm mb-3">Checkout is temporarily unavailable. Please try again shortly.</p>
          <p v-else-if="createError" class="text-error text-sm mb-3">{{ createError }}</p>

        </div>

      </div>
      <div class="text-center">
          <UButton color="accent" size="xl" :loading="creating" :disabled="checkoutUnavailable" @click="proceedToPayment" class="m-auto mt-5" :label="checkoutUnavailable ? 'Checkout Unavailable' : 'Proceed to Payment'" />
      </div>
    </template>
  </Container>
</template>
