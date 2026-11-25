<script setup lang="ts">
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import type { ManageTicketsResponse, ManagedPlace } from '../../../types/manage-tickets'

/**
 * Buyer's "Manage tickets" page for one order: name who each place is for,
 * set who each companion comes with, and give each add-on to an attendee.
 * Reached from My orders and the order details page. Everything is
 * re-checked server-side (places.get.ts / the two PATCH routes).
 */
const route = useRoute()
const orderId = route.params.id as string

// Same client-only fetch as order/[id].vue: production keeps the login
// token in localStorage, which the server can't see during SSR.
const auth = useAuthStore()
const toast = useToast()
const requestCookieHeaders = useRequestHeaders(['cookie'])

const { data, status, error, refresh } = useFetch<ManageTicketsResponse>(`/api/checkout/order/${orderId}/places`, {
  key: `manage-tickets-${orderId}`,
  server: false,
  headers: computed(() => ({
    ...requestCookieHeaders,
    ...(auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : {}),
  })),
})

function personName(place: ManagedPlace): string | null {
  const r = place.registration
  return r ? [r.first_name, r.last_name].filter(Boolean).join(' ') || null : null
}

// Every attendee in this order who isn't cancelled — what add-ons can be
// given to. Unnamed places still count (they're paid places), labelled by
// number so the buyer can allocate before naming.
const attendeeOptions = computed(() => {
  if (!data.value) return []
  const delegates = data.value.places.map((place, i) => ({ place, label: personName(place) ?? `Delegate place ${i + 1} (not named yet)` }))
  const companions = data.value.companions.map((place, i) => ({ place, label: personName(place) ?? `Accompanying place ${i + 1} (not named yet)` }))
  return [...delegates, ...companions]
    .filter(({ place }) => place.registration && place.registration.status !== 'cancelled')
    .map(({ place, label }) => ({ label, value: place.registration!.id }))
})

// Companions can only come with a delegate from this order.
const hostOptions = computed(() => {
  if (!data.value) return []
  return data.value.places
    .filter((place) => place.registration && place.registration.status !== 'cancelled')
    .map((place, i) => ({ label: personName(place) ?? `Delegate place ${i + 1} (not named yet)`, value: place.registration!.id }))
})

const unallocatedCount = computed(() => data.value?.add_ons.filter((addOn) => !addOn.registration).length ?? 0)

const savingAddOn = ref<string | null>(null)

async function allocateAddOn(ticketId: string, registrationId: string) {
  savingAddOn.value = ticketId
  try {
    await $fetch(`/api/checkout/order/${orderId}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : undefined,
      body: { registration: registrationId },
    })
    toast.add({ title: 'Saved', icon: 'i-lucide-check-circle', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Could not save', description: err?.data?.statusMessage ?? 'Please try again.', icon: 'i-lucide-circle-x', color: 'error' })
  } finally {
    savingAddOn.value = null
    await refresh()
  }
}
</script>

<template>
  <Container class="my-8 max-w-2xl">
    <UButton :to="`/checkout/order/${orderId}`" variant="ghost" color="neutral" icon="i-lucide-arrow-left" label="Back to order" class="mb-6" />

    <h1 class="text-2xl font-semibold text-foreground mb-1 font-heading">Manage tickets</h1>
    <p class="text-md text-description mb-6 font-mono">Order #{{ orderId.slice(3) }}</p>

    <div v-if="status === 'pending' || status === 'idle'" class="text-description">Loading…</div>
    <div v-else-if="(error as any)?.statusCode === 404 || (error as any)?.statusCode === 401" class="text-description">
      We couldn't find this order for you. <NuxtLink to="/checkout/my-orders" class="text-accent underline">Go to My orders</NuxtLink> to log in or find your orders.
    </div>
    <div v-else-if="error" class="text-error">Could not load this order right now. Please try again shortly.</div>

    <div v-else-if="data" class="space-y-8">
      <UAlert
        v-if="!data.can_change"
        color="neutral"
        variant="subtle"
        icon="i-lucide-lock"
        title="Changes are closed"
        description="Ticket assignments can no longer be changed online. Please contact us if something needs to change."
      />

      <section v-if="data.places.length">
        <h2 class="font-semibold text-foreground mb-1">Delegates</h2>
        <p class="text-sm text-description mb-3">Tell us who each place is for. We'll email them so they can complete their own details.</p>
        <div class="space-y-3">
          <CheckoutManagePlaceCard
            v-for="(place, i) in data.places"
            :key="place.ticket_id"
            :order-id="orderId"
            :place="place"
            :number="i + 1"
            :can-change="data.can_change"
            @saved="refresh()"
          />
        </div>
      </section>

      <section v-if="data.companions.length">
        <h2 class="font-semibold text-foreground mb-1">Accompanying persons</h2>
        <p class="text-sm text-description mb-3">Give their name, and choose which delegate in this order they're coming with.</p>
        <p v-if="!hostOptions.length" class="text-sm text-description mb-3">
          There's no delegate in this order for them to accompany. Please <NuxtLink :to="{ path: '/contact-us', query: { issue: `Order #${orderId.slice(3)}: accompanying person` } }" class="text-accent underline">contact us</NuxtLink>.
        </p>
        <div class="space-y-3">
          <CheckoutManagePlaceCard
            v-for="(place, i) in data.companions"
            :key="place.ticket_id"
            :order-id="orderId"
            :place="place"
            :number="i + 1"
            :can-change="data.can_change && hostOptions.length > 0"
            :host-options="hostOptions"
            @saved="refresh()"
          />
        </div>
      </section>

      <section v-if="data.add_ons.length">
        <h2 class="font-semibold text-foreground mb-1">Add-ons</h2>
        <p class="text-sm text-description mb-3">
          Choose who each add-on is for.
          <span v-if="unallocatedCount" class="font-medium text-foreground">{{ unallocatedCount }} still to allocate.</span>
        </p>
        <ul class="space-y-3">
          <li v-for="addOn in data.add_ons" :key="addOn.ticket_id" class="border border-input rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p class="font-medium text-foreground">{{ addOn.ticket_name ?? 'Add-on' }}</p>
              <UBadge v-if="!addOn.registration" color="warning" variant="subtle" label="Not allocated" class="mt-1" />
            </div>

            <!-- Attached to someone outside this order (e.g. bought later for
                 an existing attendee): shown, but not movable from here. -->
            <p v-if="addOn.registration && !attendeeOptions.some((o) => o.value === addOn.registration)" class="text-sm text-description">
              For {{ addOn.registration_name ?? 'another attendee' }}
            </p>
            <p v-else-if="!data.can_change" class="text-sm text-description">
              {{ addOn.registration_name ? `For ${addOn.registration_name}` : 'Not allocated' }}
            </p>
            <USelect
              v-else
              :model-value="addOn.registration ?? undefined"
              :items="attendeeOptions"
              placeholder="Choose an attendee"
              :loading="savingAddOn === addOn.ticket_id"
              :disabled="savingAddOn !== null || !attendeeOptions.length"
              class="w-full sm:w-64"
              @update:model-value="(value: any) => value && value !== addOn.registration && allocateAddOn(addOn.ticket_id, value)"
            />
          </li>
        </ul>
      </section>

      <p v-if="!data.places.length && !data.companions.length && !data.add_ons.length" class="text-description">
        There are no tickets to manage on this order.
      </p>
    </div>
  </Container>
</template>
