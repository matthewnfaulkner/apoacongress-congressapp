<script setup lang="ts">
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import type { ManagedPlace } from '../../types/manage-tickets'

/**
 * One place on the buyer's Manage tickets page: shows who it's for, or a
 * form to name someone (empty place, or "Change"). Companions also pick
 * which delegate in the order they come with. Saves through
 * PATCH /api/checkout/order/:id/registrations/:registrationId, which
 * re-checks everything server-side.
 */
const props = defineProps<{
  orderId: string
  place: ManagedPlace
  /** 1-based, for "Place 2" when nobody is named yet. */
  number: number
  canChange: boolean
  /** Companions only: this order's delegates to choose a host from. */
  hostOptions?: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{ saved: [] }>()

const auth = useAuthStore()
const toast = useToast()

const registration = computed(() => props.place.registration)
const isCompanion = computed(() => props.place.kind === 'accompanying')
const isCancelled = computed(() => registration.value?.status === 'cancelled')
const hasPerson = computed(() => Boolean(registration.value?.first_name || registration.value?.last_name || registration.value?.email))

const displayName = computed(() => {
  const r = registration.value
  if (!r) return null
  return [r.title, r.first_name, r.last_name].filter(Boolean).join(' ') || null
})

const hostName = computed(() =>
  props.hostOptions?.find((option) => option.value === registration.value?.host_registration)?.label ?? null,
)

// Empty places open straight into the form; named ones only after "Change".
const editing = ref(false)
const showForm = computed(() => props.canChange && !isCancelled.value && Boolean(registration.value) && (editing.value || !hasPerson.value))

const form = reactive({ title: '', first_name: '', last_name: '', email: '', host_registration: '' })

function resetForm() {
  const r = registration.value
  form.title = r?.title ?? ''
  form.first_name = r?.first_name ?? ''
  form.last_name = r?.last_name ?? ''
  form.email = r?.email ?? ''
  form.host_registration = r?.host_registration ?? (props.hostOptions?.length === 1 ? props.hostOptions[0]!.value : '')
}
watch(registration, resetForm, { immediate: true })

// Mirrors the server's rule (isDifferentPerson): a new email means a new
// person, so their own badge details will be cleared. Warn before saving.
const willReplacePerson = computed(() => {
  const current = registration.value?.email?.trim().toLowerCase()
  return Boolean(current) && current !== form.email.trim().toLowerCase()
})

const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function save() {
  if (!registration.value) return
  saving.value = true
  errorMessage.value = null

  try {
    await $fetch(`/api/checkout/order/${props.orderId}/registrations/${registration.value.id}`, {
      method: 'PATCH',
      headers: auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : undefined,
      body: {
        title: form.title,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        ...(isCompanion.value ? { host_registration: form.host_registration } : {}),
      },
    })
    editing.value = false
    toast.add({
      title: 'Saved',
      description: form.email ? `We'll email ${form.email} so they can complete their details.` : undefined,
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
    emit('saved')
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? 'Could not save. Please try again.'
  } finally {
    saving.value = false
  }
}

function cancelEdit() {
  resetForm()
  errorMessage.value = null
  editing.value = false
}
</script>

<template>
  <div class="border border-input rounded-md p-4">
    <div class="flex justify-between items-start gap-4 mb-2">
      <div>
        <p class="text-xs font-semibold text-description uppercase tracking-wide">{{ place.ticket_name ?? (isCompanion ? 'Accompanying person' : 'Delegate') }}</p>
        <p v-if="!showForm" class="font-medium text-foreground">
          {{ displayName ?? `Place ${number} — nobody named yet` }}
        </p>
      </div>
      <div class="flex gap-2 shrink-0">
        <UBadge v-if="registration?.delegate_label" color="neutral" variant="subtle" :label="registration.delegate_label" />
        <UBadge v-if="isCancelled" color="error" variant="subtle" label="Cancelled" />
      </div>
    </div>

    <p v-if="!registration" class="text-sm text-description">This place is still being set up. Please check back in a few minutes.</p>

    <template v-else-if="!showForm">
      <p v-if="registration.email" class="text-sm text-description">{{ registration.email }}</p>
      <p v-if="isCompanion && hostName" class="text-sm text-description">Accompanying {{ hostName }}</p>
      <UButton
        v-if="canChange && !isCancelled"
        class="mt-3"
        variant="outline"
        color="neutral"
        size="md"
        icon="i-lucide-pencil"
        label="Change"
        @click="editing = true"
      />
    </template>

    <form v-else class="space-y-3 mt-2" @submit.prevent="save">
      <div class="grid grid-cols-1 sm:grid-cols-[6rem_1fr_1fr] gap-3">
        <UFormField label="Title">
          <UInput v-model="form.title" placeholder="Dr" class="w-full" />
        </UFormField>
        <UFormField label="First name" required>
          <UInput v-model="form.first_name" class="w-full" />
        </UFormField>
        <UFormField label="Last name" required>
          <UInput v-model="form.last_name" class="w-full" />
        </UFormField>
      </div>

      <UFormField
        label="Email"
        :required="!isCompanion"
        :description="isCompanion ? 'Optional. If given, we\'ll email them so they can add their own details.' : 'We\'ll email them so they can complete their details.'"
      >
        <UInput v-model="form.email" type="email" class="w-full" />
      </UFormField>

      <UFormField v-if="isCompanion" label="Accompanying" required>
        <USelect
          v-model="form.host_registration"
          :items="hostOptions ?? []"
          placeholder="Choose a delegate in this order"
          class="w-full"
        />
      </UFormField>

      <UAlert
        v-if="willReplacePerson"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        description="A new email gives this place to someone else. Details the previous person added (badge name, organisation, city, country) will be cleared."
      />

      <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

      <div class="flex gap-2">
        <UButton type="submit" color="accent" :loading="saving" label="Save" />
        <UButton v-if="hasPerson" variant="ghost" color="neutral" label="Cancel" @click="cancelEdit" />
      </div>
    </form>
  </div>
</template>
