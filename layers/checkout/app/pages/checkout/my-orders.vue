<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { TTOrder } from '../../types/ticket-tailor'

// Sourced from the auth store (reactive Pinia state — see
// authenticated.global.ts's setAuth) rather than reading
// $directusTokenStorage.get() directly: a plain localStorage read isn't a
// reactive dependency Vue can track, so a computed based on it would only
// ever evaluate once. That still wouldn't help on the server, though —
// production's json auth mode keeps its token in localStorage, which flat
// out doesn't exist during SSR — so this fetch is forced client-only
// (`server: false`, same trick profile.vue uses via its onMounted-gated
// `ready` flag) and only ever runs once the browser has a real token.
const auth = useAuthStore()
const requestCookieHeaders = useRequestHeaders(['cookie'])

// Same site-data source ChargeTableRegistration.vue etc. already use — the
// page already knows which congress it's for, so that's passed straight
// through with the access-token request rather than looked up again server
// side.
const siteData = useSiteDataStore().siteData as Site
const congressId = siteData.congress?.[0]?.id ?? null

// Always fetched — a guest with a verified email session (see
// getCheckoutEmailSession) has no Directus account at all, so gating on
// isLoggedIn like before would hide their own orders even though the
// server would happily return them off the session cookie alone. A 401
// here just means neither auth path applies.
const { data: orders, status, error } = useFetch<TTOrder[]>('/api/checkout/my-orders', {
  key: 'my-orders',
  server: false,
  headers: computed(() => ({
    ...requestCookieHeaders,
    ...(auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : {}),
  })),
})

const isUnauthenticated = computed(() => (error.value as any)?.statusCode === 401)

// "Get a link to your orders" — the guest equivalent of logging in, see
// orders-access/request.post.ts. Only relevant once we already know there's
// no session/email-session covering this request at all.
const emailSchema = z.object({
  email: z.string().email('Invalid email'),
})
type EmailSchema = z.output<typeof emailSchema>
const emailState = reactive<Partial<EmailSchema>>({ email: undefined })
const requesting = ref(false)
const requestSent = ref(false)

async function requestAccessLink(submitEvent: FormSubmitEvent<EmailSchema>) {
  requesting.value = true
  try {
    await $fetch('/api/checkout/orders-access/request', {
      method: 'POST',
      body: { email: submitEvent.data.email, congress: congressId },
    })
    requestSent.value = true
  } finally {
    requesting.value = false
  }
}
</script>

<template>

<Container class="my-8 max-w-2xl">
    {{ error }}
    <template v-if="isUnauthenticated">
      <UCard class="lg:w-[50%] m-auto h-full mt-30">
        <h1 class="text-2xl font-semibold text-foreground mb-6 font-heading">My Orders</h1>

        <div v-if="requestSent" class="text-description text-lg">
          If that email has any orders, we've sent a link to view them — check your inbox.
        </div>
        <div v-else class="space-y-6">
          <UForm :schema="emailSchema" :state="emailState" class="space-y-4" @submit="requestAccessLink">
            <UFormField label="Email" name="email" description="Enter the email you used at checkout to receive a link to your orders." size="xl">
              <UInput v-model="emailState.email" class="w-80" />
            </UFormField>
            <UButton color="accent" size="xl" type="submit" :loading="requesting" label="Send me a link" />
          </UForm>

          <p class="text-description text-sm">
            Have an account? <NuxtLink to="/login" class="text-accent underline">Log in</NuxtLink> instead.
          </p>
        </div>
      </UCard>
      
    </template>
    <template v-else>
    <h1 class="text-2xl font-semibold text-foreground mb-6 font-heading">My Orders</h1>

    <div v-if="status === 'pending' || status === 'idle'" class="text-description">Loading your orders…</div>
    <div v-else-if="error" class="text-error">{{error}}Could not load your orders right now. Please try again shortly.</div>
    <div v-else-if="!orders || orders.length === 0" class="text-description">
      <UCard class="lg:w-[50%] m-auto h-full mt-30" variant="ghost">
        <p>We couldn't find any orders.</p>
        <ULink to="/contact" class="underline text-accent" >Can't find your order? </ULink>
      </UCard>
    </div>
    
    <div v-else class="flex flex-col gap-6">
      <div v-for="order in orders" :key="order.id" class="border border-input rounded-lg p-4">
        <div class="flex justify-between items-center mb-1">
          <h2 class="font-semibold text-foreground font-mono">Order #{{ order.id.slice(3) }}</h2>
          <UBadge :color="orderStatusColor(order)" variant="solid" size="xl" :label="orderStatusLabel(order)" />
        </div>

        <p class="text-md text-description mb-4">{{ orderDate(order) }}</p>

        <ul class="space-y-2 mb-4">
          <li v-for="ticket in issuedTickets(order)" :key="ticket.id" class="flex justify-between text-sm gap-4">
            <span>{{ ticket.description }}<span v-if="ticket.full_name"> — {{ ticket.full_name }}</span></span>
            <span v-if="ticket.listed_price !== null" class="font-medium shrink-0">{{ formatMoney(ticket.listed_price, order.currency.code) }}</span>
          </li>
        </ul>

        <div class="border-t border-input pt-3 mb-4 space-y-1">
          <div class="flex justify-between text-sm">
            <span>Subtotal</span>
            <span class="font-medium">{{ formatMoney(orderSubtotal(order), order.currency.code) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>Booking fee</span>
            <span class="font-medium">{{ formatMoney(orderBookingFee(order), order.currency.code) }}</span>
          </div>
          <div class="flex justify-between font-semibold text-foreground pt-1">
            <span>Total</span>
            <span>{{ formatMoney(order.total, order.currency.code) }}</span>
          </div>
        </div>

        <div class="flex gap-3">
          <UButton
            :to="`/checkout/order/${order.id}`"
            variant="subtle"
            color="secondary"
            size="xl"
            label="View Details"
          />
        </div>
      </div>
      <ULink to="/contact" class="underline text-accent" >Can't find your order? </ULink>

    </div>
    
    </template>
  </Container>
</template>
