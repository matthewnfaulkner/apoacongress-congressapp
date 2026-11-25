<script setup lang="ts">
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'
import type { MyCompanion } from '../../types/my-registrations'

/**
 * One person accompanying the delegate, on My registration: shown with an
 * Edit button, or a form to name them (empty, or after Edit). Saves via
 * PATCH /api/checkout/my-registrations/:hostId/companions/:id — same rules
 * as the buyer's Manage tickets (server: savePerson).
 */
const props = defineProps<{
  hostId: string
  companion: MyCompanion
  number: number
  canChange: boolean
}>()
const emit = defineEmits<{ saved: [] }>()

const auth = useAuthStore()
const toast = useToast()

const displayName = computed(() =>
  [props.companion.title, props.companion.first_name, props.companion.last_name].filter(Boolean).join(' ') || null,
)
const hasPerson = computed(() => Boolean(props.companion.first_name || props.companion.last_name || props.companion.email))

const editing = ref(false)
const showForm = computed(() => props.canChange && (editing.value || !hasPerson.value))

const form = reactive({ title: '', first_name: '', last_name: '', email: '' })
function resetForm() {
  form.title = props.companion.title ?? ''
  form.first_name = props.companion.first_name ?? ''
  form.last_name = props.companion.last_name ?? ''
  form.email = props.companion.email ?? ''
}
watch(() => props.companion, resetForm, { immediate: true })

// Same rule as the server: a new email means a new person.
const willReplacePerson = computed(() => {
  const current = props.companion.email?.trim().toLowerCase()
  return Boolean(current) && current !== form.email.trim().toLowerCase()
})

const saving = ref(false)
const errorMessage = ref<string | null>(null)

async function save() {
  saving.value = true
  errorMessage.value = null
  try {
    await $fetch(`/api/checkout/my-registrations/${props.hostId}/companions/${props.companion.id}`, {
      method: 'PATCH',
      headers: auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : undefined,
      body: { ...form },
    })
    editing.value = false
    toast.add({ title: 'Saved', icon: 'i-lucide-check-circle', color: 'success' })
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
  <div class="border border-input rounded-md p-3">
    <div v-if="!showForm" class="flex items-center justify-between gap-3">
      <div>
        <p class="font-medium text-foreground">{{ displayName ?? `Accompanying person ${number} — not named yet` }}</p>
        <p v-if="companion.email" class="text-sm text-description">{{ companion.email }}</p>
      </div>
      <UButton
        v-if="canChange"
        variant="outline"
        color="neutral"
        size="sm"
        icon="i-lucide-pencil"
        label="Edit"
        @click="editing = true"
      />
    </div>

    <form v-else class="space-y-3" @submit.prevent="save">
      <div class="grid grid-cols-1 sm:grid-cols-[6rem_1fr_1fr] gap-3">
        <UFormField label="Title">
          <UInput v-model="form.title" placeholder="Mr" class="w-full" />
        </UFormField>
        <UFormField label="First name" required>
          <UInput v-model="form.first_name" class="w-full" />
        </UFormField>
        <UFormField label="Last name" required>
          <UInput v-model="form.last_name" class="w-full" />
        </UFormField>
      </div>
      <UFormField label="Email" description="Optional. If given, we'll email them so they can add their own details.">
        <UInput v-model="form.email" type="email" class="w-full" />
      </UFormField>

      <UAlert
        v-if="willReplacePerson"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        description="A new email gives this place to someone else. Details the previous person added will be cleared."
      />

      <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
      <div class="flex gap-2">
        <UButton type="submit" color="accent" :loading="saving" label="Save" />
        <UButton v-if="hasPerson" variant="ghost" color="neutral" label="Cancel" @click="cancelEdit" />
      </div>
    </form>
  </div>
</template>
