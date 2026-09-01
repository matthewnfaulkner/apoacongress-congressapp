<script setup lang="ts">
const props = defineProps<{
  ticketName: string
  instructions?: string | null
  // Set by complete.vue once a "Proceed to Payment" click has been rejected
  // for a missing file here specifically — distinct from validationError
  // below (a bad file that was actually selected) so the "required" message
  // only shows up after an actual attempt, not just because the field starts
  // out empty.
  invalid?: boolean
}>()

const file = defineModel<File | null>({ default: null })

const validationError = ref<string | null>(null)
const displayError = computed(() => validationError.value ?? (props.invalid && !file.value ? 'This file is required.' : null))

// Re-enforced server-side (evidence-upload.post.ts) — this is just for
// immediate feedback without a round trip.
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

// UFileUpload's own `accept` only filters the file picker dialog — drag-and-
// drop can still hand it anything, so the size/type check still happens here.
// Setting file.value back to null re-triggers this watcher; suppressReset
// skips clearing the error message we just set on that re-entrant call.
let suppressReset = false

watch(file, (selected) => {
  if (!selected) {
    if (suppressReset) {
      suppressReset = false
      return
    }
    validationError.value = null
    return
  }

  if (selected.size > MAX_BYTES) {
    validationError.value = 'File must be 5MB or smaller.'
    suppressReset = true
    file.value = null
  } else if (!ALLOWED_TYPES.includes(selected.type)) {
    validationError.value = 'File must be a PDF, JPEG, or PNG.'
    suppressReset = true
    file.value = null
  } else {
    validationError.value = null
  }
})
</script>

<template>
  <div class="border rounded-lg p-3" :class="displayError ? 'border-error' : 'border-secondary'">
    <h3 class="text-lg font-semibold text-foreground mb-1">Evidence required for {{ ticketName }}</h3>
    <p v-if="instructions" class="text-description whitespace-pre-line mb-3 bg-background border rounded-md p-3">{{ instructions }}</p>

    <UFileUpload
      v-model="file"
      accept="application/pdf,image/jpeg,image/png"
      label="Drop your file here, or click to browse"
      description="PDF, JPEG, or PNG, up to 5MB"
      icon="i-lucide-upload"
      :highlight="!!displayError"
      :color="displayError ? 'error' : undefined"
    />
    <p v-if="displayError" class="text-error text-sm mt-2">{{ displayError }}</p>
  </div>
</template>
