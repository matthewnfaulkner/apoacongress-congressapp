<script setup lang="ts">
import { type scheduleGridItem, GridItemTypes } from '@/types/grid-types';
import { Grid } from 'lucide-vue-next';

const props = defineProps<{
  i?: string,
  label?: string,
  session?: CongressSession,
  x: number | string;
  y: number | string;
  room?: VenueRoom | undefined;
  rooms?: VenueRoom[];
  startTime?: string | null;
  endTime?: string | null;
  day?: string,
  days?: string[];
  sections?: string[];
  schedule?: string;
  timeSubDivision: number,
  yLimit: number,
  type: GridItemTypes,
}>()

const editing = props.i ? true : false;

const emit = defineEmits<{ 
        close: [scheduleGridItem?],
    }>()

const newItem : scheduleGridItem = {
    x: props.x as number,
    y: props.y as number,
    w: 1,
    h: 1,
    i: props.room?.id + "adsasd",
    label: `newitem`,
    static: false,
    isResizable: true,
    isDraggable: true,
    type: GridItemTypes.Session,
    color: '#000'
}

const handleSessionCreated = (success, createdSession, section) => {
  if(!success) return;

  const newSessionGridItem = {
    x: props.x as number + 1,
    y: props.y as number + 1,
    h: Math.ceil(minutesBetween(createdSession.starttime, createdSession.endtime) / props.timeSubDivision),
    w: 1,
    i: createdSession.id,
    static: false,
    type: GridItemTypes.Session,
    label: `${section?.name} - ${createdSession?.title}`,
    color: section.color,
    session: createdSession,
  } 

  emit('close', newSessionGridItem );
}

const handleSessionUpdated = (success, createdSession, section) => {
  if(!success) return;

  const newSessionGridItem = {
    x: props.x as number + 1,
    y: props.y as number + 1,
    h: Math.ceil(minutesBetween(createdSession.starttime, createdSession.endtime) / props.timeSubDivision),
    w: 1,
    i: createdSession.id,
    static: false,
    type: GridItemTypes.Session,
    label: `${section?.name} - ${createdSession?.title}`,
    color: section.color,
    session: createdSession,
  } 

  emit('close', newSessionGridItem );
}

const handleBreakCreated = (success, createdBreak) => {
  if(!success) return;

  const newBreakGridItem = {
    x: props.x as number + 1,
    y: props.y as number + 1,
    h: Math.ceil(minutesBetween(createdBreak.starttime, createdBreak.endtime) / props.timeSubDivision),
    w: 1,
    i: createdBreak.id,
    static: false,
    type: GridItemTypes.Break,
    label: createdBreak.name,
    color: "#fbe928",
    break: createdBreak
  } 

  emit('close', newBreakGridItem );
}

const handleBreakUpdated = (success, updatedBreak) => {
  if(!success) return;

  const newBreakGridItem = {
    x: props.x as number + 1,
    y: props.y as number + 1,
    h: Math.ceil(minutesBetween(updatedBreak.starttime, updatedBreak.endtime) / props.timeSubDivision),
    w: updatedBreak.rooms.length,
    i: updatedBreak.id,
    static: false,
    type: GridItemTypes.Break,
    label: updatedBreak.name,
    color: "#fbe928",
    break: updatedBreak
  } 

  emit('close', newBreakGridItem );
}

type ItemTypes = 'Session' | 'Break';

 
const items = ref<ItemTypes[]>([
  'Session', 'Break'
])


const currentType = ref<ItemTypes>();


if(props.type == GridItemTypes.Break) {
  currentType.value = 'Break'
}else{
  currentType.value = 'Session'
}

</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close', undefined) }"
    :title="`${x} : ${y} : ${room?.title} : ${startTime} : A`"
  > 
    <template #title class="block">
      <p class="p-0 m-0 text-accent"> {{ room?.title }}</p>
      <div v-if="editing">
        <p class="text-xl">Editing</p>
        <p class="text-2xl">{{ label }}</p>
      </div>
      <div v-else>
        <p class="text-xl">Adding New</p>
        <USelect v-if="!editing" :items="items" v-model="currentType" default-value="Session" size="xl" class="text-2xl"></USelect>
      </div>
       
      <p class="text-muted">{{ removeSeconds(props.session?.starttime) || startTime   }} : {{ removeSeconds(props.session?.endtime)}} - {{ day }}</p>
    </template>
    <template #body>
       <SessionForm 
          v-if="currentType == 'Session'"
          :startTime="props.session?.starttime ||  startTime || ''" 
          :endTime="props.session?.endtime || endTime || ''"
          :room="room?.id" 
          :schedule="schedule" 
          :time-sub-division="timeSubDivision" 
          :y-limit="yLimit"
          @session-created="handleSessionCreated"
          @session-updated="handleSessionUpdated"
          :editing="editing"
          :session="session"
          >
        </SessionForm>
        <BreakForm
          v-else-if="currentType == 'Break'"
          :id="i || ''"
          :name="label || ''"
          :startTime="startTime || ''" 
          :endTime="endTime || ''"
          :rooms="rooms || [{
              id: room?.id || '',
              title: room?.title
            }]"
          :schedule="schedule" 
          :time-sub-division="timeSubDivision" 
          :y-limit="yLimit"
          @break-created="handleBreakCreated"
          @break-updated="handleBreakUpdated"
          :editing="editing"
        >

        </BreakForm>
    </template>
   
  </UModal>
</template>
