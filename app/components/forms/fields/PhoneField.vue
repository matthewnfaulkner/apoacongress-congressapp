<script setup lang="ts">
import { cn } from '#shared/utils'
import type { PhoneObject } from 'vue-tel-input'

const props = defineProps<{
  modelValue: string
  name?: string
  class?: string
}>()

const emit = defineEmits(['update:modelValue'])

// v-model here is just what's shown in the visible text box — vue-tel-input
// parses it itself (including a full "+<dialCode><number>" value, e.g. one
// restored from persisted form state — see complete.vue) to pick the right
// flag/dial code. @on-input's phoneObject.number is already the correctly
// composed full number, so that's what actually gets emitted — manually
// re-concatenating a separately-tracked dial code (the previous version of
// this field) double-counted it whenever the initial value already included
// one, e.g. "+44+44…".
const rawInput = ref(props.modelValue)

function handleInput(_formatted: string, phoneObject: PhoneObject) {
  emit('update:modelValue', phoneObject.number)
}
</script>

<template>
  <!--
    vue-tel-input ships its own default look (border/background/radius) with
    enough specificity that plain utility classes on the component itself
    don't reliably override it — same issue the source project's version of
    this field hit. Instead of fighting that with !important overrides of
    guessed colors, the outer div here owns the actual visible border/
    background/focus-ring (identical classes to Input.vue, so it matches
    every other text field), and the scoped style below just strips
    vue-tel-input's own border/background so the outer div shows through.
  -->
  <div
    :class="cn('vue-tel-input-wrapper flex h-11 w-full items-center rounded-md border border-input bg-background px-3 ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', props.class)"
  >
    <vue-tel-input
      v-model="rawInput"
      valid-characters-only
      default-country="TW"
      :input-options="{
        placeholder: '',
        name: name || 'phone',
        required: false,
      }"
      class="w-full h-10"
      @on-input="handleInput"
    />
  </div>
</template>

<style>
.vue-tel-input-wrapper .vue-tel-input {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  width: 100%;
}

.vue-tel-input-wrapper .vti__input {
  background: transparent !important;
  border: none !important;
  outline: none !important;
  height: 100%;
}
</style>
