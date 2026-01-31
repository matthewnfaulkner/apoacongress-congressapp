<script setup lang="ts">
  
const props = defineProps<{
  title: string,
  helpMessage: string,
  helpMessageData: string,
}>()

const emit = defineEmits<{ close: [boolean] }>()

</script>

<template>
  <UModal :title=title>
                <template #body>
                        <p class="text-muted">{{helpMessage}} </p> 
                        <p class="text-2xl text-center my-3"> {{ helpMessageData }}</p>
                        <div  class="flex gap-4 justify-between mx-20" >
                            <UButton label="Cancel" variant="outline" color="secondary" @click="emit('close', false)"/>
                            <UButton label="Delete" color="accent"  @click="emit('close', true)"/>
                        </div>
                </template>
            </UModal>
</template>


