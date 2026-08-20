<script setup lang="ts">
const steps = [
  { value: '/checkout', title: 'Registration', icon: 'i-lucide-ticket' },
  { value: '/checkout/addons', title: 'Add-ons', icon: 'i-lucide-package-plus' },
  { value: '/checkout/accommodation', title: 'Accommodation', icon: 'i-lucide-bed' },
  { value: '/checkout/tours', title: 'Tours', icon: 'i-lucide-map' },
  { value: '/checkout/workshops', title: 'Workshops', icon: 'i-lucide-graduation-cap' },
  { value: '/checkout/complete', title: 'Review', icon: 'i-lucide-check' },
  { value: '/checkout/payment', title: 'Checkout', icon: 'i-lucide-credit-card' },
]

const route = useRoute()
const router = useRouter()
const { orderId } = useCheckoutAddOn()

// National (Taiwan) visitors are redirected off-site before ever reaching
// this checkout (see server/middleware/national-redirect.ts) — the manual
// "swap pricing" locality override that used to live here has  been dropped
// along with it. checkoutEvent.locality should only ever resolve to
// "international" for anyone actually seeing this component now.

const currentIndex = computed(() => steps.findIndex((step) => step.value === route.path))

// reka-ui's `linear` mode still allows clicking exactly one step ahead — this
// disables every step beyond the current one so the stepper can only be used
// to go back; forward progress stays exclusively via the Continue button.
const items = computed(() => steps.map((step, index) => ({ ...step, disabled: index >5 /*disabled: index > currentIndex.value*/ })))

const activeValue = computed({
  get: () => route.path,
  set: (value: string | number | undefined) => {
    if (typeof value === 'string' && value !== route.path) router.push(checkoutStepLink(value, orderId.value))
  },
})

// UStepper stretches to fill its container by default, which spreads steps too
// far apart inside the site's wide max-w-7xl Container on desktop — constrained
// and centered here instead. Titles are hidden below sm (icons alone stay
// legible at that width; vertical orientation didn't work well on mobile).
</script>

<template>
  <UStepper
    v-model="activeValue"
    :items="items"
    color="accent"
    linear
    class="mb-2 max-w-2xl mx-auto"
    :ui="{ title: 'hidden sm:block', trigger: 'cursor-pointer disabled:cursor-not-allowed' }"
  />
</template>
