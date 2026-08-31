<script setup lang="ts">
    
// Fetched eagerly rather than lazily on first dropdown open — this is a
// static public/ JSON file (negligible cost, browser-cached after the first
// load), and a pre-filled modelValue (e.g. a persisted form value) needs the
// full list already loaded to resolve its label/emoji immediately. Loading
// it lazily meant a pre-filled country showed as just its raw code until
// the user opened the dropdown once, which is what actually triggered the
// fetch.
const { data: countries, status } = await useFetch<{
  name: string
  code: string
  emoji: string
}[]>('/api/countries.json')
</script>

<template>
  <USelectMenu
    :items="countries"
    :loading="status === 'pending'"
    label-key="name"
    :search-input="{ icon: 'i-lucide-search' }"
    placeholder="Select country"
    class="w-48"
  >
    <template #leading="{ modelValue, ui }">
      {{}}
      <span v-if="modelValue" class="size-5 text-center">
        {{ countries?.find(country => country.code === (modelValue as unknown as string))?.emoji }}
      </span>
      <UIcon v-else name="i-lucide-earth" :class="ui.leadingIcon()" />
    </template>
    <template #item-leading="{ item }">
      <span class="size-5 text-center">
        {{ item.emoji }}
      </span>
    </template>
  </USelectMenu>
</template>

