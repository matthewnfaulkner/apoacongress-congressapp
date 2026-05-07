<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { buildZodSchema } from '~/lib/zodSchemaBuilder'
import type { FormFlowField, FormField } from '~~/shared/types/schema'
import type { DirectusUser } from '@directus/sdk'

const props = defineProps<{
  fields:        FormFlowField[]
  isFirst:       boolean
  isLast:        boolean
  description?:  string | null
  storedValues?: Record<string, any>
  backLabel?:    string
}>()

const emit = defineEmits<{
  next: [values: Record<string, any>]
  prev: []
}>()

const authStore = useAuthStore()
const auth = (authStore.isAuthenticated ? authStore.isAuthenticated : {}) as Partial<DirectusUser>

const sortedFields = computed(() =>
  [...props.fields].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
)

const visibleFields = computed(() =>
  sortedFields.value
)

const hiddenFields = computed(() =>
  sortedFields.value.filter((f): f is FormFlowField & { name: string } => !!f.name && f.type === 'hidden')
)

// Evaluated once at mount — component remounts per step via :key
const validationSchema = visibleFields.value.length
  ? toTypedSchema(buildZodSchema(visibleFields.value as unknown as FormField[]))
  : undefined

const initialValues = computed(() => {
  if (props.storedValues && Object.keys(props.storedValues).length) {
    return props.storedValues
  }
  return sortedFields.value.reduce((acc, field) => {
    if (!field.name) return acc
    const key = field.name.replace(/-/g, '_') as keyof typeof auth
    switch (field.type) {
      case 'checkbox':       acc[field.name] = false; break
      case 'checkbox_group': acc[field.name] = [];    break
      default:               acc[field.name] = key in auth ? (auth[key] ?? '') : ''
    }
    return acc
  }, {} as Record<string, any>)
})

const { handleSubmit, values } = useForm({
  validationSchema,
  initialValues: initialValues.value,
})

const onSubmit = handleSubmit((formValues) => emit('next', formValues))

function widthClass(width: FormFlowField['width']): string {
  switch (width) {
    case '67': return 'md:col-span-2'
    case '50': return ''
    case '33': return ''
    default:   return 'md:col-span-2'
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <input
      v-for="field in hiddenFields"
      :key="field.id"
      type="hidden"
      :name="field.name"
      :value="initialValues[field.name] || values[field.name]"
    />

    <div v-if="description" v-html="description" class="prose dark:prose-invert max-w-none mb-4 text-sm text-muted" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
      <BaseFormField
        v-for="field in visibleFields"
        :key="field.id"
        :field="(field as unknown as FormField)"
        :class="widthClass(field.width)"
      />
    </div>

    <div class="flex justify-between items-center pt-2">
      <UButton
        v-if="!isFirst"
        type="button"
        :label="backLabel ?? 'Back'"
        color="neutral"
        variant="outline"
        size="xl"
        leading-icon="i-lucide-arrow-left"
        @click="$emit('prev')"
      />
      <div v-else />

      <UButton
        type="submit"
        :label="isLast ? 'Review' : 'Next'"
        color="accent"
        variant="solid"
        size="xl"
        trailing-icon="i-lucide-arrow-right"
      />
    </div>
  </form>
</template>
