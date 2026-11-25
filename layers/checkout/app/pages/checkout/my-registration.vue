<script setup lang="ts">
import type { MyRegistration } from '../../types/my-registrations'

/**
 * The attendee's own page: every registration on this site that's theirs
 * (by account, or by verified login-link email). Buyers manage who their
 * places are for on My orders → Manage tickets instead.
 *
 * Path is /checkout/my-registration because the Directus "place assigned"
 * email links here.
 */
const auth = useAuthStore()
const requestCookieHeaders = useRequestHeaders(['cookie'])

// Client-only for the same reason as my-orders.vue: production's login
// token lives in localStorage, which SSR can't see.
const { data: registrations, status, error, refresh } = useFetch<MyRegistration[]>('/api/checkout/my-registrations', {
  key: 'my-registrations',
  server: false,
  headers: computed(() => ({
    ...requestCookieHeaders,
    ...(auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : {}),
  })),
})

const isUnauthenticated = computed(() => (error.value as any)?.statusCode === 401)
</script>

<template>
  <Container class="my-8 max-w-2xl">
    <CheckoutEmailLoginCard
      v-if="isUnauthenticated"
      heading="My Registration"
      email-description="Enter the email your place was registered under to receive a link to your registration."
      sent-message="If that email has a registration, we've sent a link to view it — check your inbox."
      login-redirect="/checkout/my-registration"
      purpose="registration"
    />

    <template v-else>
      <h1 class="text-2xl font-semibold text-foreground mb-6 font-heading">My Registration</h1>

      <div v-if="status === 'pending' || status === 'idle'" class="text-description">Loading your registration…</div>
      <div v-else-if="error" class="text-error">Could not load your registration right now. Please try again shortly.</div>
      <UCard v-else-if="!registrations?.length" class="lg:w-[50%] m-auto h-full mt-30" variant="outline">
        <p class="text-description mb-2">We couldn't find a registration for you.</p>
        <p class="text-sm text-description mb-2">
          If someone booked a place for you, ask them to add your name and email on their order. If you booked yourself,
          your tickets are under <NuxtLink to="/checkout/my-orders" class="text-accent underline">My orders</NuxtLink>.
        </p>
        <ULink to="/contact-us" class="underline text-accent">Need help?</ULink>
      </UCard>

      <div v-else class="flex flex-col gap-6">
        <CheckoutMyRegistrationCard
          v-for="registration in registrations"
          :key="registration.id"
          :registration="registration"
          @saved="refresh()"
        />
      </div>
    </template>
  </Container>
</template>
