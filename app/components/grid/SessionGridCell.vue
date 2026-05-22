<script setup lang="ts">
const props = defineProps<{
  session: CongressSession
}>()

const { organisationNames, firstTag } = useSessionLabel(computed(() => props.session))
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-0 p-0 m-0">
    <p v-if="organisationNames" class="text-sm font-[Open_Sans]">{{ organisationNames }}</p>
    <p class="bg-white/50 rounded px-1 font-[Open_Sans]">{{ session.title }}</p>
    <i v-if="firstTag" class="text-sm font-[Open_Sans] text-gray-700">{{ firstTag }}</i>
  </div>
</template>
