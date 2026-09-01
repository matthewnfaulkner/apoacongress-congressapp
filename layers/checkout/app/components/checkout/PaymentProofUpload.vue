<script setup lang="ts">
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const props = defineProps<{
  orderId: string
  existingProof?: { id: string; filename_download: string; uploaded_on: string } | null
  // Only set on confirmation.vue, for a guest right after checkout who has
  // neither a session nor an email session yet — see payment-proof.post.ts.
  guestToken?: string | null
  // Ticket Tailor's own box-office-configured instructions for this payment
  // method (order.payment_method?.instructions) — shown in the same box as
  // the upload prompt rather than as a separate panel, since they're both
  // about the same pending manual payment.
  instructions?: string | null
}>()

const emit = defineEmits<{ uploaded: [proof: { id: string; filename_download: string; uploaded_on: string }] }>()

const auth = useAuthStore()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref<string | null>(null)

// Drives this component's own display (file-info line, button label)
// directly, rather than solely relying on the parent receiving `uploaded`
// and flowing existingProof back down through a prop — one broken link
// anywhere in that round trip and nothing visibly updates here. Seeded from
// the prop so an already-uploaded proof still shows up on initial render.
const currentProof = ref(props.existingProof ?? null)
watch(() => props.existingProof, (value) => { currentProof.value = value ?? null })

// Both enforced again server-side (payment-proof.post.ts) — this is just for
// immediate feedback without a round trip.
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPE_PREFIXES = ['image/', 'application/pdf', 'text/plain']

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (file.size > MAX_BYTES) {
    uploadError.value = 'File must be 5 MB or smaller.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  if (!ALLOWED_TYPE_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
    uploadError.value = 'File must be an image, PDF, or text file.'
    if (fileInput.value) fileInput.value.value = ''
    return
  }

  uploading.value = true
  uploadError.value = null

  try {
    const formData = new FormData()
    formData.append('file', file)
    if (props.guestToken) formData.append('guestToken', props.guestToken)

    const accessToken = auth.lastToken
    const proof = await $fetch<{ id: string; filename_download: string; uploaded_on: string }>(
      `/api/checkout/order/${props.orderId}/payment-proof`,
      {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      },
    )
    currentProof.value = proof
    emit('uploaded', proof)
    toast.add({
      title: 'Proof of payment uploaded',
      description: 'Thanks — we\'ll review it shortly.',
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  } catch (err: any) {
    const message = err?.data?.statusMessage ?? 'Could not upload your file. Please try again.'
    uploadError.value = message
    toast.add({
      title: 'Upload failed',
      description: message,
      icon: 'i-lucide-circle-x',
      color: 'error',
    })
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="bg-warning/10 border border-warning rounded-lg p-3">
    <template v-if="instructions">
      <h1 class="text-2xl font-semibold text-foreground mb-1">Payment instructions</h1>
      <p class="text-description whitespace-pre-line mb-3">{{ instructions }}</p>
    </template>

    <h3 class="text-lg font-semibold text-foreground mb-1">Upload proof of payment</h3>
    <p class="text-description mb-2">
      Your payment is still pending. Please upload a receipt or bank transfer confirmation so we can verify it.
    </p>

    <div v-if="currentProof" class="flex items-center gap-2 text-xl mb-2 ring-2 p-2 ring-secondary/30 rounded-md">
      <UIcon name="i-lucide-file-check-2" class="text-success shrink-0" />
      <span>
        {{ currentProof.filename_download }} uploaded
        {{ new Date(currentProof.uploaded_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}
      </span>
    </div>

    <input ref="fileInput" type="file" class="hidden" accept="image/*,.pdf,.txt" @change="handleFileChange" />
    <UButton
      :label="currentProof ? 'Replace file' : 'Upload file'"
      :loading="uploading"
      variant="outline"
      color="accent"
      size="sm"
      icon="i-lucide-upload"
      @click="fileInput?.click()"
    />
    <p v-if="uploadError" class="text-error text-sm mt-2">{{ uploadError }}</p>
  </div>
</template>
