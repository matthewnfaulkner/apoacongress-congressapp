<script setup lang="ts">

export type EditEventMode = 'create' | 'update'


const props = defineProps<{
  session: CongressSession | null,
  event: CongressEvent | null,
  parent: CongressEvent | null,
  mode: EditEventMode
  timeSubDivision: number
}>()

const isChild = props.parent ? true : false;

const containerTitle = isChild ? props.parent?.title : `${props.session?.section?.name} ${props.session?.title} -  ${props.session?.starttime} -  ${props.session?.endtime}`

const handleEventCreated = (success: boolean, createdEvent: CongressEvent) => {
  if(success) emit("close", createdEvent);
}

const handleEventUpdated = (success: boolean, updatedEvent: CongressEvent) => {
  if(success) emit("close", updatedEvent);
}

const emit = defineEmits<{ 
        close: [CongressEvent?]
    }>()

</script>

<template>

    <UModal
      :title="(mode == 'update' ? `Editing Event in ` :  'Adding Event to ') + containerTitle"
      :close="{ onClick: () => emit('close') }"
    > 
      <template #body>
          <EventForm :mode="mode" 
            :session="isChild? null : session" :event="event" 
            :parent="parent" 
            :time-sub-divison="timeSubDivision" 
            @event-created="handleEventCreated"
            @event-updated="handleEventUpdated"/>
      </template>
  </UModal>
</template>
