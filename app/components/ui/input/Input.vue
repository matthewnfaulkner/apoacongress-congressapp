<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '#shared/utils'
import { useVModel } from '@vueuse/core'
import { useClipboard } from '@vueuse/core'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js'

const { copy, copied } = useClipboard()
const toast = useToast()
const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  enableCopy?: boolean | null;
  readonly?: boolean | null;
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})

function copyValue() {
  if (!modelValue.value) return
  copy(String(modelValue.value))
  toast.add({ title: 'Copied to clipboard', color: 'accent' })
}
</script>

<template>
  <UInput
    v-model="modelValue"
    :readonly="!!readonly"
    variant="none"
    :ui="{
      root: cn('relative flex items-center w-full', enableCopy && readonly && 'cursor-pointer'),
      base: cn('flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', enableCopy && readonly && 'cursor-pointer', props.class),
    }"
    @click="enableCopy && readonly && copyValue()"
  >
    <template v-if="modelValue && enableCopy" #trailing>
      <UTooltip text="Copy to clipboard" :content="{ side: 'right' }">
        <UButton
          :color="copied ? 'accent' : 'black'"
          variant="link"
          size="xl"
          :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
          aria-label="Copy to clipboard"
          @click.stop="copyValue()"
        />
      </UTooltip>
    </template>
  </UInput>
</template>
