<script setup lang="ts">
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import type { MyRegistration } from '../../types/my-registrations'

/**
 * One of the attendee's registrations on My registration: who it's for,
 * delegate number and badge type, their tickets, companions, and the
 * details they fill in themselves (saved via
 * PATCH /api/checkout/my-registrations/:id).
 */
const props = defineProps<{ registration: MyRegistration }>()
const emit = defineEmits<{ saved: [] }>()

const auth = useAuthStore()
const toast = useToast()

const displayName = computed(() =>
  [props.registration.title, props.registration.first_name, props.registration.last_name].filter(Boolean).join(' ') || 'Your registration',
)

// Same static list CountrySelectMenu uses. The country is stored by name
// (registration.country is free text, and imports/admin read it as-is).
const { data: countries } = useFetch<Array<{ name: string; code: string; emoji: string }>>('/api/countries.json', { key: 'countries' })
const countryNames = computed(() => countries.value?.map((country) => country.name) ?? [])

const form = reactive({ badge_name: '', organisation_name: '', city: '', country: '' })
function resetForm() {
  form.badge_name = props.registration.badge_name ?? ''
  form.organisation_name = props.registration.organisation_name ?? ''
  form.city = props.registration.city ?? ''
  form.country = props.registration.country ?? ''
}
watch(() => props.registration, resetForm, { immediate: true })

const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function save() {
  saving.value = true
  errorMessage.value = null
  try {
    await $fetch(`/api/checkout/my-registrations/${props.registration.id}`, {
      method: 'PATCH',
      headers: auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : undefined,
      body: { ...form },
    })
    toast.add({ title: 'Details saved', icon: 'i-lucide-check-circle', color: 'success' })
    emit('saved')
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? 'Could not save. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="border border-input rounded-lg p-4 space-y-5">
    <div class="flex justify-between items-start gap-4">
      <div>
        <h2 class="text-xl font-semibold text-foreground">{{ displayName }}</h2>
        <p v-if="registration.email" class="text-sm text-description">{{ registration.email }}</p>
        <p v-if="registration.badge_type_name" class="text-sm text-description">{{ registration.badge_type_name }}</p>
      </div>
      <div class="flex flex-col items-end gap-1 shrink-0">
        <UBadge v-if="registration.delegate_label" color="neutral" variant="solid" size="xl" :label="registration.delegate_label" />
        <UBadge v-if="registration.status === 'pending'" color="warning" variant="subtle" label="Awaiting payment" />
      </div>
    </div>

    <div>
      <h3 class="text-xs font-semibold text-description uppercase tracking-wide mb-2">Tickets</h3>
      <ul class="space-y-1">
        <li v-for="ticket in registration.tickets" :key="ticket.id" class="flex items-center gap-2 text-sm">
          <UIcon :name="ticket.kind === 'admission' ? 'i-lucide-ticket' : 'i-lucide-plus-circle'" class="text-description shrink-0" />
          <span>{{ ticket.name ?? (ticket.kind === 'admission' ? 'Registration' : 'Add-on') }}</span>
        </li>
      </ul>
    </div>

    <p v-if="registration.host_name" class="text-sm">Accompanying <span class="font-medium">{{ registration.host_name }}</span></p>
    <div v-if="registration.companions.length">
      <h3 class="text-xs font-semibold text-description uppercase tracking-wide mb-2">Accompanying Person</h3>
      <div class="space-y-2">
        <CheckoutCompanionEditor
          v-for="(companion, i) in registration.companions"
          :key="companion.id"
          :host-id="registration.id"
          :companion="companion"
          :number="i + 1"
          :can-change="registration.can_change"
          @saved="emit('saved')"
        />
      </div>
    </div>

    <UButton
      v-if="registration.status === 'confirmed'"
      :to="`/checkout?registrationId=${registration.id}`"
      color="accent"
      variant="outline"
      size="lg"
      icon="i-lucide-plus"
      label="Add tickets"
      class="w-full sm:w-auto justify-center"
    />
    <p v-if="registration.status === 'confirmed'" class="text-xs text-description -mt-3">Add-ons such as workshops and tours, or an accompanying person.</p>

    <form class="space-y-3 border-t border-input pt-4" @submit.prevent="save">
      <h3 class="font-semibold text-foreground">Your details</h3>
      <UFormField label="Name on badge" description="Leave empty to use your full name.">
        <UInput v-model="form.badge_name" class="w-full" />
      </UFormField>
      <UFormField label="Organisation" description="Hospital, university or company.">
        <UInput v-model="form.organisation_name" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField label="City">
          <UInput v-model="form.city" class="w-full" />
        </UFormField>
        <UFormField label="Country">
          <USelectMenu
            v-model="form.country"
            :items="countryNames"
            :search-input="{ icon: 'i-lucide-search' }"
            placeholder="Select country"
            class="w-full"
          />
        </UFormField>
      </div>

      <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
      <UButton type="submit" color="accent" :loading="saving" label="Save details" />
    </form>
  </div>
</template>
