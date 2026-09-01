<script setup lang="ts">
const props = defineProps<{
  ticketName: string
  instructions?: string | null
  // How many evidence files this line needs — one per ticket purchased (see
  // complete.vue's evidenceEntries), not just one per ticket type.
  count: number
  // Set by complete.vue once a "Proceed to Payment" click has been rejected
  // for this field specifically — distinct from the type/size/count checks
  // below (which apply as soon as files are picked) so the "required"
  // message only shows up after an actual attempt, not just because the
  // field starts out empty.
  invalid?: boolean
}>()

const files = defineModel<File[]>({ default: () => [] })

// Re-enforced server-side (evidence-upload.post.ts) — this is just for
// immediate feedback without a round trip. Bad files are left in the list
// (UFileUpload's own multi-file view already has a per-file delete button)
// rather than silently stripped, so the customer can see exactly which one
// needs removing.
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

const typeSizeError = computed(() => {
  const bad = files.value.find((file) => file.size > MAX_BYTES || !ALLOWED_TYPES.includes(file.type))
  if (!bad) return null
  return bad.size > MAX_BYTES ? 'Each file must be 5MB or smaller.' : 'Each file must be a PDF, JPEG, or PNG.'
})

const countError = computed(() => {
  if (!files.value.length || typeSizeError.value) return null
  if (files.value.length !== props.count) {
    return `Please upload exactly ${props.count} file${props.count === 1 ? '' : 's'} (one per ticket) — ${files.value.length} selected.`
  }
  return null
})

const requiredError = computed(() =>
  props.invalid && files.value.length === 0 ? `${props.count} file${props.count === 1 ? '' : 's'} required.` : null,
)

const displayError = computed(() => typeSizeError.value ?? countError.value ?? requiredError.value)
</script>

<template>
  <div class="border rounded-lg p-3" :class="displayError ? 'border-error' : 'border-secondary'">
    <h3 class="text-lg font-semibold text-foreground mb-1">Evidence required for each {{ ticketName }}</h3>
    <p v-if="instructions" class="text-description whitespace-pre-line mb-3 bg-background border rounded-md p-3">{{ instructions }}</p>
    <p class="text-description text-sm mb-2">Upload {{ count }} file{{ count === 1 ? '' : 's' }} — one per ticket.</p>

    <UFileUpload
      v-model="files"
      multiple
      accept="application/pdf,image/jpeg,image/png"
      label="Drop your files here, or click to browse"
      description="PDF, JPEG, or PNG, up to 5MB each"
      icon="i-lucide-upload"
      :highlight="!!displayError"
      :color="displayError ? 'error' : undefined"
    />
    <p v-if="displayError" class="text-error text-sm mt-2">{{ displayError }}</p>
  </div>
</template>
