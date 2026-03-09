<script setup lang="ts">
import "vue-zoomable/dist/style.css";
import type { TabsItem } from '@nuxt/ui'
import  AddModal from '@/components/grid/AddModal.vue';
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { type scheduleGridItem, GridItemTypes, type scheduleTabItem  } from '../../types/grid-types';
import { minutesBetween, toMinutes } from "@/utils/time-utils";
import type { NavigationMenuItem } from '@nuxt/ui'
import EditModal from "~/components/grid/EditModal.vue";
import { deleteItem, updateItem, createItem } from '@directus/sdk';
import { ConfirmationModal } from "~/components/ui/modal";
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';


const { $directus, $isAuthenticatedWithPolicy } = useNuxtApp();
const toast = useToast();
const zoomStates = ref<Record<number, number>>([]);
const panStates = ref<Record<number, { x: number; y: number; deltaX: number; deltaY: number }>>({})
const canPan =ref(true);

const revealed = ref(false)
const el = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const isAuthenticated = await $isAuthenticatedWithPolicy('Schedule - Editor');

const isLoggedIn = computed(() =>
  isAuthenticated ? true: false
)

const loading = ref(true);

onMounted(async() => {

  loading.value = false;
  if (!el.value) return

  observer = new IntersectionObserver(
    ([entry]) => {
      revealed.value = entry.intersectionRatio <= 0.5
    },
    {
      threshold: [0, 0.5, 1]
    }
  )
  observer.observe(el.value);

  await nextTick()

  const gridEl = document.querySelector<HTMLElement>('.grid');

  if (!gridEl) {
    console.error('Grid element not found');
    return;
  }

  gridEl.style.setProperty('--rows', '56');
  gridEl.style.setProperty('--columns', (rooms.value.length + 1).toString());
  gridEl.style.setProperty('--row-height', '20px');

})


onBeforeUnmount(() => {
  observer?.disconnect()
})


const panEnabled = ref(true)
const isDraggable = ref(false)

let pressTimer: number | null = null
let moved = false

const onPointerDown = (e: PointerEvent) => {
  // ⛔ Ignore presses not on grid items
  if (!isOnGridItem(e)){
    panEnabled.value=true;
    return
  } 
  panEnabled.value=false;
  moved = false

  pressTimer = window.setTimeout(() => {
    if (moved) return

    // ENTER drag mode
    panEnabled.value = false
    isDraggable.value = true
  }, 300)
}

const onPointerMove = () => {
  moved = true
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

const onPointerUp = () => {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
    
  }

  // EXIT drag mode
  panEnabled.value = true
  isDraggable.value = false
}



const isOnGridItem = (e: PointerEvent): boolean => {
  const gridItem = (e.target as HTMLElement)?.closest('.vue-grid-item');
  if(gridItem){
    if((gridItem.getAttribute('data-grid-item-type') as number) == GridItemTypes.Session){
      return true
    }
    if((gridItem.getAttribute('data-grid-item-type') as number) == GridItemTypes.Break){
      return true
    }
  }
  return false
}


const {
	data: congress,
	error,
	refresh,
} = await useFetch<Congress>('/api/schedule', {
	key: `schedule`,
});

if (!congress.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Congress not found', fatal: true });
}

const rooms = computed(() => (congress.value?.venue?.rooms as VenueRoom[]) || []);
const days = computed(() => (congress.value?.days as CongressDay[]) || []);

// Make tabs a reactive object
const tabs = reactive(
  Object.fromEntries(
    days.value.map(day => {
      const dayTimeScale = 60 / (2 * (day.time_subdivision as number));

      return [
        day.id,
        { 
          label: day.title || '',
          schedule: day?.schedules[0]?.id,
          timeScale: dayTimeScale,
          timeSubDivision: day.time_subdivision as number,
          published: day.schedules.length > 0,
          timeSlots: rooms.value.flatMap((room, roomIndex) =>
            day.timeslots?.map((timeslot, timeslotIndex) => ({
              y: timeslotIndex + 1,
              x: roomIndex + 1,
              w: 1,
              h: 1,
              i: timeslot.id + '-' + room.id,
              label: '+',
              static: false,
              isResizable: false,
              isDraggable: false,
              type: GridItemTypes.Empty,
              color: '',
              maxW: 1,
            }))
          ) || [],
          sessions: reactive(
            day?.schedules?.flatMap(schedule =>
              schedule.sessions?.map(session => {
                const roomIndex = rooms.value.findIndex(
                  room => room.id === session?.room?.id
                );
                const duration = Math.ceil(
                  minutesBetween(session.starttime || day.starttime, session.endtime) /
                    (day?.time_subdivision as number)
                );
                const start = Math.ceil(
                  minutesBetween(day?.starttime, session.starttime || day.starttime) /
                    (day?.time_subdivision as number)
                );

                return reactive({
                  y: start + 1,
                  x: roomIndex + 1,
                  w: 1,
                  h: duration,
                  i: session.id,
                  label: `${session?.section?.name} - ${session?.title}`,
                  static: false,
                  isResizable: true,
                  isDraggable: true,
                  type: GridItemTypes.Session,
                  color: session.section?.color,
                  session: session,
                  events: session.events,
                  maxW: 1,
                });
              }) || []
            ) || []
          ),
          breaks: reactive(
            day?.schedules?.flatMap(schedule =>
              schedule.breaks?.map(b => {
                const startIndex = rooms.value.findIndex(
                  room => room.id === b?.rooms[0]?.room
                );
                const duration = Math.ceil(
                  minutesBetween(b.starttime, b.endtime) /
                    (day?.time_subdivision as number)
                );
                const start = Math.ceil(
                  minutesBetween(day?.starttime, b.starttime) /
                    (day?.time_subdivision as number)
                );

                return reactive({
                  y: start + 1,
                  x: startIndex + 1,
                  w: b?.rooms?.length,
                  h: duration,
                  i: b.id,
                  label: b.name,
                  static: false,
                  isResizable: true,
                  isDraggable: true,
                  type: GridItemTypes.Break,
                  color: '#fbe928',
                  maxW: rooms.value.length,
                  break: b,
                });
              }) || []
            ) || []
          ),
          colHeaders: day?.timeslots?.map((slot, index) => ({
            y: index + 1,
            x: 0,
            w: 1,
            h: 1,
            i: 'grid-' + slot.id,
            label: index % dayTimeScale === 0 ? slot.starttime?.slice(0, 5) || '' : '',
            static: true,
            isResizable: false,
            isDraggable: false,
            type: GridItemTypes.Header,
            color: '',
            maxW: 1
          })) || [],
          startTime: day.starttime,
          endTime: day.endtime,
          numCols:
            Math.ceil(minutesBetween(day.starttime, day.endtime) / day?.time_subdivision) || 0
        }
      ];
    })
  )
);

// Convert to reactive array for tabsArray
const tabsArray = computed(() => Object.values(tabs) as TabsItem[]);
const currentTab = computed(() => tabsArray.value[activeTab.value || 0])
// Keep track of empty time slots reactively
const tabsEmptyTimeSlots = reactive<Record<string, scheduleGridItem[]>>({});
tabsArray.value.forEach((tab, index) => {
  zoomStates.value[index] = 0.8;
  panStates.value[index] = { x: -50, y: 50, deltaX: 0, deltaY: 2 };
  tabsEmptyTimeSlots[index] = tab.timeSlots;
});

const gridItemRooms = rooms.value.map<scheduleGridItem>((room, index) => {
  return {
    y: 0,
    x: index+1,
    w: 1,
    h: 1,
    i: room.id,
    static: true,
    type: GridItemTypes.Header,
    isDraggable: false,
    isResizable: false,
    label: room.title || ''
  }
})
const activeTab = ref();  


let index = 0;
watch(activeTab,  (newtab) => {
  const selector = '#grid-' + newtab.toString();
  const gridEl = document.querySelector<HTMLElement>(selector); 
  if (!gridEl) return;

  index = activeTab.value as number;
  gridEl.style.setProperty(
    '--columns',
    String((rooms.value.length || 0)+1)
  );

  if(!tabsArray) return;
  
  if(tabsArray[activeTab.value] == undefined) return;
  
  const tabGridScale = tabsArray[activeTab.value]?.timeScale;

  gridEl.style.setProperty(
    '--grid-scale',
    String(tabGridScale)
  );

  const tabRows = tabsArray[activeTab.value]?.colHeaders.length +1;
  gridEl.style.setProperty(
    '--rows',
    String(tabRows)
  );
})


function disablePan(id : string) {
  canPan.value=false;
  activeGridItem.value = id;
}

function enablePan(i, newX, newY) {
  activeGridItem.value = '';
  canPan.value=true;
}


const overlay = useOverlay()

const modal = overlay.create(AddModal)
const editModal = overlay.create(EditModal);
const confirmationModal = overlay.create(ConfirmationModal);

const open = async(gridItem : scheduleGridItem) => {
  if(gridItem.type == GridItemTypes.Session) openSession(gridItem);
  else if(gridItem.type == GridItemTypes.Break) openBreak(gridItem);
}

async function openSession(gridItem : scheduleGridItem) {
  
  if(currentMode.value == 'copy') {

    try{
        const response = await $directus.request<CongressSession>(createItem(
            'congress_sessions',
            {
              section: gridItem.session.section.id,
              schedule: currentTab.value.schedule,
              title: gridItem.session.title + '-copy',
              room: gridItem.session.room.id,
              starttime: currentTab.value?.startTime,
              endtime: addMinutesToTime(currentTab.value?.startTime, 30),
            }
          ))
        
        const newGridItem = {
              y: gridItem.y,
              x: rooms.value.length + 1,
              i: response.id,
              w: gridItem.w,
              h: gridItem.h,
              label: `${gridItem.session?.section?.name} - ${gridItem.session?.title} - copy`,
              isResizable: true,
              isDraggable: true,
              type: GridItemTypes.Session,
              color: gridItem.session?.section?.color,
              session: {...response, section: gridItem?.session?.section },
              events: null,
              maxW: 1,
        }

        currentTab.value?.sessions.push(newGridItem);
        toast.add({ title: 'Success', description: 'Session Copied', color: 'accent'})

    } catch (e) {
      console.log(e)
    }

    return;
  }

  if(currentMode.value === 'del') {
    const instance = confirmationModal.open({
      title: "Confirm Delete.",
      helpMessage: "This action is irreversible, are you sure you want to delete?",
      helpMessageData: gridItem.label || '',
    })

    
    await instance.result.then(
      (result: boolean) =>  {
        if(result) {
          try{
            const response = $directus.request(deleteItem(
                'congress_sessions',
                gridItem?.session?.id || ''
              ))

              const index = currentTab.value?.sessions.map(session => session.i).indexOf(gridItem.session?.id);
              currentTab.value?.sessions.splice(index, 1);
              toast.add({ title: 'Success', description: 'Session Deleted', color: 'accent'})

          } catch (e) {
            console.log(e)
          }
        }
      }
    )
    return;
  }
  

  const xPos = (gridItem?.x as number ) - 1;
  const yPos = (gridItem?.y as number ) - 1;
  const room = rooms.value[xPos];
  const session = gridItem.session;
  const events = gridItem.events;
  
  const instance = modal.open({
    label: gridItem.label || '',
    x: gridItem.x,
    y: gridItem.y,
    room: room,
    startTime: removeSeconds(session?.starttime),
    endTime: removeSeconds(session?.endtime),
    session: session,
    events: events,
    day: currentTab.value?.label,
    schedule: currentTab.value?.schedule,
    timeSubDivision: currentTab.value?.timeSubDivision,
    yLimit: 100000,
  })  

  await instance.result.then(
      (result) => {
        if(result) {
          const existingItem = currentTab.value?.sessions.find(session => session.i === result?.i)
          if(existingItem) {
            existingItem.label = result.label;
            existingItem.session = result.session;
            existingItem.color = result.color;
          }
      }
    }
    )
}

async function openBreak(gridItem : scheduleGridItem) {
  
  if(currentMode.value == 'copy') {
    toast.add({ title: 'Error', description: "Cannot duplicate breaks", color: "accent"})

    return;
  }
  if(currentMode.value === 'del') {
    const instance = confirmationModal.open({
      title: "Confirm Delete.",
      helpMessage: "This action is irreversible, are you sure you want to delete?",
      helpMessageData: gridItem.label || '',
    })

    
    await instance.result.then(
      (result: boolean) =>  {
        if(result) {
          try{
            const response = $directus.request(deleteItem(
                'congress_breaks',
                gridItem?.i || ''
              ))

              const index = currentTab.value?.breaks.map(mybreak => mybreak.i).indexOf(gridItem.i);
              currentTab.value?.breaks.splice(index, 1);
              toast.add({ title: 'Success', description: 'Break Deleted', color: 'accent'})

          } catch (e) {
            console.log(e)
          }
        }
      }
    )
    return;
  }
  

  const xPos = (gridItem?.x as number ) - 1;
  const yPos = (gridItem?.y as number ) - 1;
  const instance = editModal.open({
    label: gridItem.label || '',
    i: gridItem.i,
    x: gridItem.x,
    y: gridItem.y,
    rooms: rooms.value.slice(xPos, xPos + (gridItem.w as number)),
    startTime: removeSeconds(gridItem?.break?.starttime),
    endTime: removeSeconds(gridItem?.break?.endtime),
    session: null,
    break: gridItem.break,
    events: null,
    day: currentTab.value?.label,
    schedule: currentTab.value?.schedule,
    timeSubDivision: currentTab.value?.timeSubDivision,
    yLimit: 100000,
    editing: true,
    type: GridItemTypes.Break
  })  

  await instance.result.then(
      (result) => {
        if(result) {
          const existingItem = currentTab.value?.breaks.find(mybreak => mybreak.i === result?.i)
          if(existingItem) {
            existingItem.label = result.label;
          }
      }
    }
    )
}

const activeGridItem = ref('');


type Mode = 'edit' | 'add' | 'del' | 'copy' | 'NONE'

const currentMode = ref<Mode>('NONE');

const editMode = computed(() => {
  return currentMode.value == 'edit'
})
const addMode = computed(() => {
  return currentMode.value == 'add'
})

const deleteMode = computed(() => {
  return currentMode.value == 'del'
})

const copyMode = computed(() => {
  return currentMode.value == 'copy'
})

const handleGridClick = async (e) => {
  // Find the closest grid item element that was clicked
  const element = e.target;

  if (!element) return;

  // Get the ID or coordinates from a data attribute
  const id = element.getAttribute('data-grid-item-id');

  const tabTimeSlots = currentTab.value?.timeSlots || currentTab.value?.timeSlots;
  const clickedTimeSlot = tabTimeSlots?.find(timeSlot => timeSlot.i == id);

  const xPos = (clickedTimeSlot?.x as number ) - 1;
  const yPos = (clickedTimeSlot?.y as number ) - 1;
  const room = rooms.value[xPos];

  const yLimit = [...currentTab.value?.sessions, ...currentTab.value?.sessions]
  .filter(session => session.x === clickedTimeSlot?.x && session.y > clickedTimeSlot?.y)
  .reduce((minSession, session) => {
    if (!minSession) return hToTime(session.y-1);
    return session.y < minSession.y ? hToTime(session.y-1): minSession;
  }, null as typeof currentTab.value.sessions[0] | null) || toMinutes(currentTab.value?.endTime);
  
  const addStartTime = hToTime(yPos);
  
  const instance = editModal.open({
    x: xPos,
    y: yPos,
    room: room,
    startTime:  addMinutesToTime('00:00', addStartTime),
    day: currentTab.value?.label,
    schedule: currentTab.value?.schedule,
    timeSubDivision: currentTab.value?.timeSubDivision,
    yLimit: yLimit,
    label: clickedTimeSlot.label,
    session: clickedTimeSlot.session,
    type: GridItemTypes.Session,
  }) 

  await instance.result.then(

    (result) => {
      if(result) {
        if(result.type == GridItemTypes.Session){
          currentTab.value.sessions = [...currentTab.value?.sessions, result]
          toast.add({ title: 'Success', description: 'Session Added', color: 'accent'})
        }
        else if (result.type == GridItemTypes.Break){
          currentTab.value.breaks = [...currentTab.value?.breaks, result]
          toast.add({ title: 'Success', description: 'Break Added', color: 'accent'})
        }
      }
    }
  )
};


const toolbarItems = computed(() => [
    {
    label: 'View',
    icon: 'i-lucide-eye',
    value: 'none',
    active: currentMode.value === 'NONE',
    onSelect: () => {currentMode.value = 'NONE'}
  },
  {
    label: 'Drag/ Resize',
    icon: 'i-lucide-hand',
    active: currentMode.value === 'edit',
    onSelect: () => {currentMode.value = 'edit'}

  },
  {
    label: 'Add',
    icon: 'i-lucide-cross',
    value: 'add',
    active: currentMode.value === 'add',
    onSelect: () => {currentMode.value = 'add'}
  },
  {
    label: 'Copy',
    icon: 'i-lucide-copy',
    value: 'copy',
    active: currentMode.value === 'copy',
    onSelect: () => {currentMode.value = 'copy'}
  },
  {
    label: 'Delete',
    icon: 'i-lucide-trash',
    value: 'del',
    active: currentMode.value === 'del',
    onSelect: () => {currentMode.value = 'del'}
  },

  
])

const updateOnResize = async (i: string, newH: number, newW: number, type: GridItemTypes) => {
  if(type == GridItemTypes.Session) updateSessionOnResize(i, newH, newW);
  else if (type == GridItemTypes.Break) updateBreakOnResize(i, newH, newW);
}

const updateOnDrag = async (i: string, newX: number, newY: number, type: GridItemTypes) => {
  enablePan(i, newX, newY);
  if(type == GridItemTypes.Session) await updateSessionOnDrag(i, newX, newY);
  else if (type == GridItemTypes.Break) updateBreakOnDrag(i, newX, newY);
}

const updateSessionOnResize = async (sessionId : string, newH : number, newW: number,) => {
  
  const session = currentTab.value?.sessions?.find(session => session.i == sessionId);
  if(!session) return;

  const endMinutes = hToTime(newH + session.y-1);
  const newEnd = toStringFromTotalMinutes(endMinutes);

  const payload = {
    endtime: newEnd,
  }

  try{
    const response = await $directus.request(updateItem(
      'congress_sessions',
      sessionId,
      payload
    ))
    session.session = response;

    toast.add({ title: 'Success', description: `Updated: ${session.session.title}. ${response.starttime}-${response.endtime}`, color: "accent"})
  } catch(e) {
      toast.add({ title: 'Error', description: 'Session Failed to Update'})
      console.log(e);
  }
}

const updateBreakOnResize = async (breakId : string, newH : number, newW: number) => {
  
  
  const mybreak = currentTab.value?.breaks?.find(mybreak => mybreak.i == breakId);
 
  if(!mybreak) return;

  const endMinutes = hToTime(newH + mybreak.y-1);
  const newEnd = toStringFromTotalMinutes(endMinutes);

  const newRooms = rooms.value.slice(mybreak.x-1, mybreak.x + newW -1).map(room => ({room: room.id}));
  const payload = {
    endtime: newEnd,
    rooms: newRooms
  }
  try{
    const response = await $directus.request(updateItem(
      'congress_breaks',
      breakId,
      payload
    ))
    mybreak.break = response;

    toast.add({ title: 'Success', description: `Updated: ${mybreak.name}. ${response.starttime}-${response.endtime}`, color: "accent"})
  } catch(e) {
      toast.add({ title: 'Error', description: 'Break Failed to Update'})
      console.log(e);
  }
}

const updateSessionOnDrag = async (sessionId : string, newX : number, newY: number) => {
  
  const session = currentTab.value?.sessions?.find(session => session.i == sessionId);
  if(!session) return;

  const startMinutes = hToTime(newY-1);
  const endMinutes = hToTime(newY -1 + session.h);
  const newStart = toStringFromTotalMinutes(startMinutes);
  const newEnd = toStringFromTotalMinutes(endMinutes);
  const newRoom = rooms.value[newX - 1];
  console.log(newEnd, endMinutes, session.h,newY);
  const payload = {
    starttime: newStart,
    endtime: newEnd,
    room: newRoom?.id
  }

  try{
    const response = await $directus.request(updateItem(
      'congress_sessions',
      sessionId,
      payload
    ))

    session.session = response;
    toast.add({ title: 'Success', description: `Updated: ${session.session.title}. ${response.starttime}-${response.endtime}. ${newRoom?.title}`, color:'accent'})
  } catch(e) {
      console.log(e);
  }
}

const updateBreakOnDrag = async (breakId : string, newX : number, newY: number,) => {
  
  const mybreak = currentTab.value?.breaks?.find(mybreak => mybreak.i == breakId);
  if(!mybreak) return;

  const startMinutes = hToTime(newY-1);
  const endMinutes = hToTime(newY -1 + mybreak.h);
  const newStart = toStringFromTotalMinutes(startMinutes);
  const newEnd = toStringFromTotalMinutes(endMinutes);

  const newRooms = rooms.value.slice(newX-1, newX-1 + mybreak.w).map(room => ({room: room.id}));

  const payload = {
    starttime: newStart,
    endtime: newEnd,
    rooms: newRooms
  }

  try{
    const response = await $directus.request(updateItem(
      'congress_breaks',
      breakId,
      payload
    ))

    mybreak.break = response;

    toast.add({ title: 'Success', description: `Updated: ${mybreak.name}. ${response.starttime}-${response.endtime}.`, color:'accent'})
  } catch(e) {
      console.log(e);
  }
}

function hToTime(row: number) : number{ 
  return currentTab.value?.timeSubDivision * row + toMinutes(currentTab.value?.startTime);
}

</script>

<template>
  <UError
    v-if="!isLoggedIn"
    :clear="{
      color: 'neutral',
      size: 'xl',
      icon: 'i-lucide-arrow-left',
      class: 'rounded-full'
    }"
    :error="{
      statusCode: 404,
      statusMessage: 'Permission Denied',
      message: 'You don\'t Have permission to view this page'
    }"
  />
  <div v-else>
    <div v-if="loading" class="text-black w-full h-full flex items-center justify-center">
        <UProgress color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50"/>
    </div>
    <div v-else>
      <UNavigationMenu  
        v-if="isAuthenticated"
        color="accent" 
        v-model="currentMode" 
        :items="toolbarItems" 
        highlight 
        class="flex-1 fixed z-10 w-full bg-white px-30" />
      <UTabs 
        :items="tabsArray" 
        v-model="activeTab" 
        :unmountOnHide="false" 
        color="accent"
        :ui="{
          list: 'fixed bg-white z-5 mt-12',
        }"
      > 
        
        <template #content="{ item,  index }">
              <VueZoomable class="h-full" 
                  v-model:zoom=zoomStates[index] 
                  :minZoom=".3" 
                  :wheelZoomStep=0.03 
                  :panEnabled="panEnabled" 
                  v-model:pan="panStates[index]"
                  @pointerdown="onPointerDown"
                  @pointerup="onPointerUp"
                  @pointerleave="onPointerUp"

                  zoomOrigin="pointer"
                  >

              
                <div class="grid-layout min-h-100 relative"  ref="el" >                          
                  <grid-layout
                        v-if="item.published"
                        class="w-200 grid"
                        :id="`grid-${index}`"
                        :layout.sync="item.timeSlots"
                        :col-num="rooms.length + 1"
                        :maxRows="item.numCols + 1"
                        :row-height="20 "
                        :is-draggable="false"
                        :is-resizable="false"
                        :is-mirrored="false"
                        :margin="[0, 0]"
                        :transformScale="zoomStates[index]"
                        :autoSize="false"
                        :style="{ width: `${160 * rooms.length }px` }"
                        :class="{
                          'z-5 d-none' : addMode
                        }"
                        :use-css-transforms="false"
                        :vertical-compact=false
                        :prevent-collision="true"
                        @click="handleGridClick"
                        @layout-mounted = "console.log('ready')"
                >   
                        <grid-item v-for="griditem in item.timeSlots" 
                                :x="griditem.x"
                                :y="griditem.y"
                                :w="griditem.w"
                                :h="griditem.h"
                                :i="griditem.i" 
                                :isResizable="false"
                                :isDraggable="false"
                                :static="true"
                                :key="griditem.i" 
                                class="text-center relative justify-center"
                                :class="{
                                  ' hover:bg-gray-300 cursor-crosshair': griditem.type === GridItemTypes.Empty,
                                }"
                                :data-grid-item-type="griditem.type"
                                :data-grid-item-id="griditem.i"
                                >
                                
                        </grid-item>
                </grid-layout>
                <grid-layout
                        v-if="item.published"
                        class="w-200 grid  top-0"
                        :id="`grid-${index}`"
                        :layout.sync="[...gridItemRooms, ...item.colHeaders, ...item.sessions, ...item.breaks]"
                        :col-num="rooms.length + 1"
                        :maxRows="item.numCols + 1"
                        :row-height="20 "
                        :is-draggable="editMode"
                        :is-resizable="editMode"
                        :is-mirrored="false"
                        :margin="[0, 0]"
                        :transformScale="zoomStates[index]"
                        :autoSize="false"
                        :style="{ width: `${160 * rooms.length }px`, position: 'absolute' }"
                        :use-css-transforms="true"
                        :vertical-compact=false
                        :prevent-collision="true"

                >   
                        <grid-item v-for="griditem in [...gridItemRooms, ...item.colHeaders,  ...item.sessions, ...item.breaks]" 
                              :x="griditem.x"
                              :y="griditem.y"
                              :w="griditem.w"
                              :h="griditem.h"
                              :i="griditem.i" 
                              :isResizable="griditem.isResizable && editMode"
                              :isDraggable="editMode"
                              :maxW="griditem.maxW"
                              :static="griditem.type === GridItemTypes.Empty ? false : !editMode && griditem.i != activeGridItem && !activeGridItem "
                              @move="disablePan(griditem.i)"
                              @moved="(i: string, newX: number, newY: number) => updateOnDrag(i, newX, newY, griditem.type)"
                              @resized="(i: string, newH: number, newW: number) => updateOnResize(i, newH, newW, griditem.type)"
                              :key="griditem.i" 
                              class="text-center relative justify-center vue-grid-item text-black"
                              :class="{
                                ' hover:bg-gray-300': griditem.type === GridItemTypes.Empty,
                                'bg-accent-300/30 hover:bg-accent-300' : griditem.type === GridItemTypes.Session,
                                'z-6' : addMode
                              }"
                              :style="[`background: ${griditem.color}50!important`]"
                              :data-grid-item-type="griditem.type"
                              @click="() => {if(!addMode && !editMode) open(griditem)}"
                                >
                                  <p 
                                    v-if="griditem.type === GridItemTypes.Header" 
                                    :class="`relative align-middle -top-[12px] font-bold`">
                                    {{ griditem.label }}
                                  </p>
                                  <div v-else v-if="griditem.type === GridItemTypes.Session || griditem.type === GridItemTypes.Break" 
                                      class="h-full overflow-clip font-bold flex items-center justify-center text-xl text-gray-700 text-wrap p-5" 
                                      :class="{
                                          'cursor-zoom-in' : currentMode == 'NONE',
                                          }"
                                      :style="currentMode === 'del' 
                                            ? { cursor: 'url(/icons/cursors/trash.svg), auto' } 
                                            : currentMode === 'copy' ? { cursor: 'url(/icons/cursors/copy.svg), auto' } 
                                            :{}
                                            "
                                        >
                                        {{ griditem.label }}
                                        <!--<div v-for="event in griditem.events" class="font-bold">
                                            {{ event.title}}
                                        </div>-->
                                  </div>
                                  <p 
                                    v-if="griditem.type === GridItemTypes.Empty"
                                    class="opacity-0 hover:opacity-100 text-muted cursor-pointer"
                                    > {{ griditem.label }}
                                  </p>
                        </grid-item>
                </grid-layout>

                <h3 v-else>Schedule Coming Soon</h3>
                </div>
              </VueZoomable>

  </template>
      </UTabs>
    </div>
  </div>
</template>


<style scoped>
    .zoom-layer {
      transform-origin: 0 0;
    }

.agrid::before {
    content: '';
    background-size: calc(calc(100% - 2.5px) / 37) 60px;
    background-image: linear-gradient(
            to right,
            rgb(215, 215, 215) 1px,
            transparent 1px
    ),
    linear-gradient(to bottom, rgb(216, 215, 215) 1px, transparent 1px);
    width: calc(100%);
    position: absolute;
    background-repeat: repeat;;
    height: 300px;
}

.grid {
  --columns: 9;
  --rows: 55;
  --row-height: 20px;
  --line-color: rgb(20, 19, 19);
  --line-width: 1px;
  --margin: 0px;
  --grid-scale: 3;
  height: 1000px;
}

.grid::before {
  content: '';
  position: absolute;

  width: calc(100% - var(--margin));
  height: calc(var(--rows) * var(--row-height));

  background-size:
    calc((100% - var(--margin)) / var(--columns))  var(--row-height);

  background-image: linear-gradient(
          to right,
          rgb(233, 230, 230) 1px,
          transparent 1px
  ),
  linear-gradient(to bottom, rgb(238, 237, 237) 1px, transparent 1px);

  --s: calc(var(--row-height) * var(--grid-scale)); /* control the size */
  --w: 142px;
  --_g: #c3c3c300 90deg,rgb(224, 224, 224) 0;
  --_h: #c3c3c300 90deg,rgb(208, 208, 208) 0;

background:
  conic-gradient(from 90deg at 2px 2px, var(--_h))
    0 var(--row-height) / var(--w) var(--s),
  conic-gradient(from 90deg at 1px 1px, var(--_g))
    0 var(--row-height)  / calc(var(--w)) calc(var(--s) / var(--grid-scale));

}

.vue-draggable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    right: 0;
    padding: 0 8px 8px 0;
    background-origin: content-box;
    background-color: black;
    box-sizing: border-box;
    border-radius: 10px;
    cursor: pointer;
}
</style>
