<script setup lang="ts">
import "vue-zoomable/dist/style.css";
import AddModal from '@/components/grid/AddModal.vue';
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { type scheduleGridItem, GridItemTypes } from '../../types/grid-types';
import { minutesBetween, toMinutes, removeSeconds } from "@/utils/time-utils";
import type { CongressDay, CongressSchedule, CongressSessionRoom, VenueRoom } from '#shared/types/schema';

const { $isAuthenticatedWithPolicy } = useNuxtApp();
const route = useRoute();
const siteDataStore = useSiteDataStore();

const dayIdQuery = route.query.day as string | undefined;

const isAuthenticated = await $isAuthenticatedWithPolicy('Schedule - Editor');
const isLoggedIn = computed(() => !!isAuthenticated);

const loading = ref(true);

const {
  data: congress,
  error,
} = await useFetch<Congress>('/api/schedule', { key: 'schedule' });

if (!congress.value || error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Congress not found', fatal: true });
}

const rooms = computed(() => (congress.value?.venue?.rooms as VenueRoom[]) || []);
const days = computed(() => (congress.value?.days as CongressDay[]) || []);

function buildSessionGridItems(schedule: CongressSchedule | undefined, day: CongressDay, dayRooms: VenueRoom[]) {
  if (!schedule) return []
  const timeSubDiv = day.time_subdivision as number
  const dayStart = day.starttime || '08:00'
  return schedule.sessions?.map(session => {
    const firstRoom = (session?.rooms as CongressSessionRoom[] | null)?.[0]?.room
    const roomId = typeof firstRoom === 'string' ? firstRoom : firstRoom?.id
    const roomIndex = dayRooms.findIndex(r => r.id === roomId)
    const duration = Math.ceil(minutesBetween(session.starttime || dayStart, session.endtime) / timeSubDiv)
    const start = Math.ceil(minutesBetween(dayStart, session.starttime || dayStart) / timeSubDiv)
    return reactive({
      y: start + 1,
      x: roomIndex + 1,
      w: (session?.rooms as CongressSessionRoom[] | null)?.length || 1,
      h: duration,
      i: session.id,
      label: session?.title ?? '',
      static: true,
      isResizable: false,
      isDraggable: false,
      type: GridItemTypes.Session,
      color: (() => { const raw = (session.tags as any[])?.[0]; const id = raw?.key ?? raw?.id ?? raw; return id ? (siteDataStore.scientificTags.find(t => t.id === id)?.color ?? null) : null })(),
      session: session,
      events: session.events,
      maxW: dayRooms.length,
    })
  }) || []
}

function buildBreakGridItems(schedule: CongressSchedule | undefined, day: CongressDay, dayRooms: VenueRoom[]) {
  if (!schedule) return []
  const timeSubDiv = day.time_subdivision as number
  const dayStart = day.starttime || '08:00'
  return schedule.breaks?.map(b => {
    const startIndex = dayRooms.findIndex(r => r.id === b?.rooms?.[0]?.room)
    const duration = Math.ceil(minutesBetween(b.starttime, b.endtime) / timeSubDiv)
    const start = Math.ceil(minutesBetween(dayStart, b.starttime) / timeSubDiv)
    return reactive({
      y: start + 1,
      x: startIndex + 1,
      w: b?.rooms?.length,
      h: duration,
      i: b.id,
      label: b.name,
      static: true,
      isResizable: false,
      isDraggable: false,
      type: GridItemTypes.Break,
      color: '#fbe928',
      maxW: dayRooms.length,
      break: b,
    })
  }) || []
}

const tabs = reactive(
  Object.fromEntries(
    days.value.map((day, dayIndex) => {
      const dayTimeScale = 60 / (2 * (day.time_subdivision as number))
      const dayRooms = rooms.value
      const firstSchedule = (day.schedules as CongressSchedule[])?.[0]
      const selectedScheduleId = firstSchedule?.id || null
      return [
        day.id,
        {
          value: String(dayIndex),
          label: day.title || '',
          dayId: day.id,
          dayKey: (day as any).key || '',
          schedules: day.schedules || [],
          selectedScheduleId,
          scheduleOptions: (day.schedules || []).map((s: any) => ({ label: s.name || 'Unnamed Schedule', value: s.id })),
          loaded: true,
          fullDay: null as CongressDay | null,
          timeScale: dayTimeScale,
          timeSubDivision: day.time_subdivision as number,
          published: (day.schedules?.length || 0) > 0,
          timeSlots: dayRooms.flatMap((room, roomIndex) =>
            day.timeslots?.map((timeslot, timeslotIndex) => ({
              y: timeslotIndex + 1,
              x: roomIndex + 1,
              w: 1, h: 1,
              i: timeslot.id + '-' + room.id,
              label: '',
              static: true,
              isResizable: false,
              isDraggable: false,
              type: GridItemTypes.Empty,
              color: '',
              maxW: 1,
            }))
          ) || [],
          sessions: reactive(buildSessionGridItems(firstSchedule, day as CongressDay, dayRooms)) as scheduleGridItem[],
          breaks: reactive(buildBreakGridItems(firstSchedule, day as CongressDay, dayRooms)) as scheduleGridItem[],
          colHeaders: day?.timeslots?.map((slot, index) => ({
            y: index + 1,
            x: 0, w: 1, h: 1,
            i: 'grid-' + slot.id,
            label: index % dayTimeScale === 0 ? (slot.starttime as string)?.slice(0, 5) || '' : '',
            static: true,
            isResizable: false,
            isDraggable: false,
            type: GridItemTypes.Header,
            color: '',
            maxW: 1,
          })) || [],
          startTime: day.starttime,
          endTime: day.endtime,
          numCols: Math.ceil(minutesBetween(day.starttime, day.endtime) / (day?.time_subdivision as number)) || 0,
        }
      ]
    })
  )
)

loading.value = false

const tabsArray = computed(() => Object.values(tabs) as any[])

const initialTabIndex = dayIdQuery
  ? (tabsArray.value as any[]).findIndex(tab => tab.dayId === dayIdQuery)
  : 0
const activeTab = ref(String(initialTabIndex !== -1 ? initialTabIndex : 0))

const currentTab = computed(() => tabsArray.value[Number(activeTab.value) || 0])

const zoomStates = ref<Record<number, Ref<number, number>>>({})
const panStates = ref<Record<number, Ref<{ x: number; y: number; deltaX: number; deltaY: number }>>>({})

tabsArray.value.forEach((_tab, index) => {
  zoomStates.value[index] = ref(initialView().zoom)
  panStates.value[index] = ref(initialView().pan)
})

function getTabRooms(_tab: any): VenueRoom[] {
  return rooms.value
}

const gridItemRooms = computed(() =>
  rooms.value.map<scheduleGridItem>((room, index) => ({
    y: 0, x: index + 1, w: 1, h: 1,
    i: room.id,
    static: true,
    type: GridItemTypes.Header,
    isDraggable: false,
    isResizable: false,
    label: room.title || '',
  }))
)

async function selectSchedule(dayId: string, scheduleId: string) {
  const tab = tabs[dayId]
  if (!tab) return

  const day = days.value.find(d => d.id === dayId) as CongressDay
  if (!day) return

  const schedule = (day.schedules as CongressSchedule[])?.find(s => s.id === scheduleId)
  const dayRooms = rooms.value

  tab.selectedScheduleId = scheduleId
  tab.sessions = reactive(buildSessionGridItems(schedule, day, dayRooms))
  tab.breaks = reactive(buildBreakGridItems(schedule, day, dayRooms))
  tab.loaded = true

  const tabIdx = Number(activeTab.value)
  const view = initialView()
  zoomStates.value[tabIdx] = ref(view.zoom)
  panStates.value[tabIdx] = ref(view.pan)
}

const el = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
const revealed = ref(false)

onMounted(async () => {
  if (el.value) {
    observer = new IntersectionObserver(
      ([entry]) => { revealed.value = entry.intersectionRatio <= 0.5 },
      { threshold: [0, 0.5, 1] }
    )
    observer.observe(el.value)
  }

  await nextTick()
  const gridEl = document.querySelector<HTMLElement>('.grid')
  if (gridEl) {
    gridEl.style.setProperty('--rows', '56')
    gridEl.style.setProperty('--columns', (rooms.value.length + 1).toString())
    gridEl.style.setProperty('--row-height', '20px')
  }
})

onBeforeUnmount(() => observer?.disconnect())

const panEnabled = ref(true)


watch(activeTab, async (newTab) => {
  const idx = Number(newTab)
  const tab = tabsArray.value[idx] as any
  if (tab?.dayId && tab?.selectedScheduleId && !tab.loaded) {
    await selectSchedule(tab.dayId, tab.selectedScheduleId)
  }
}, { immediate: true })

watch(activeTab, (newTab) => {
  const idx = Number(newTab)
  const gridEl = document.querySelector<HTMLElement>(`#grid-${idx}`)
  if (!gridEl) return
  const tab = tabsArray.value[idx]
  if (!tab) return
  gridEl.style.setProperty('--columns', String((rooms.value.length || 0) + 1))
  gridEl.style.setProperty('--grid-scale', String(tab?.timeScale))
  gridEl.style.setProperty('--rows', String((tab?.colHeaders?.length || 0) + 1))
})

const overlay = useOverlay()
const modal = overlay.create(AddModal)

async function open(gridItem: scheduleGridItem) {
  if (gridItem.type !== GridItemTypes.Session || !(gridItem as any).session) return
  const xPos = (gridItem.x as number) - 1
  const tab = currentTab.value
  const tabRooms = getTabRooms(tab)
  const instance = modal.open({
    label: gridItem.label || '',
    x: gridItem.x,
    y: gridItem.y,
    rooms: tabRooms.slice(xPos, xPos + Number(gridItem.w)),
    allRooms: tabRooms,
    startTime: removeSeconds((gridItem as any).session?.starttime),
    endTime: removeSeconds((gridItem as any).session?.endtime),
    session: (gridItem as any).session,
    events: (gridItem as any).events,
    day: tab?.label,
    schedule: tab?.selectedScheduleId,
    timeSubDivision: tab?.timeSubDivision,
    yLimit: 100000,
  })
  await instance.result
}

function initialView() {
  const w = import.meta.client ? window.innerWidth : 1280
  if (w < 768)  return { zoom: 0.3,  pan: { x: 5,   y: -300,  deltaX: 2.5,  deltaY: 7.5 } }
  if (w < 1280) return { zoom: 0.63, pan: { x: 6.2, y: -100, deltaX: -0.6, deltaY: -0.6 } }
  return              { zoom: 0.8,  pan: { x: -50,  y: -50,  deltaX: 0,    deltaY: 2 } }
}
</script>

<template>
  <UError
    v-if="!isLoggedIn"
    :clear="{ color: 'neutral', size: 'xl', icon: 'i-lucide-arrow-left', class: 'rounded-full' }"
    :error="{ statusCode: 404, statusMessage: 'Permission Denied', message: 'You don\'t have permission to view this page' }"
  />
  <div class="py-2" v-else>
    <div v-if="loading" class="text-black w-full h-full flex items-center justify-center">
      <UProgress color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50" />
    </div>
    <div v-else>
      <UTabs
        :items="tabsArray"
        v-model="activeTab"
        :unmountOnHide="false"
        color="accent"
        :ui="{
          list: 'fixed bg-white z-5 mt-0 lg:w-[70%]',
        }"
      >
        <template #content="{ item, index }">
        
          <VueZoomable
            class="h-full"
            v-model:zoom="zoomStates[index]"
            :minZoom=".3"
            :wheelZoomStep="0.03"
            :panEnabled="panEnabled"
            v-model:pan="panStates[index]"
            zoomOrigin="pointer"
          >
            <div class="grid-layout min-h-100 relative" ref="el">
              <Headline class="p-2 text-accent" :headline="`Congress Program - ${item.label}`"/>
              <grid-layout
                v-if="item.published"
                class="w-200 grid"
                :id="`grid-${index}`"
                :layout.sync="[...gridItemRooms, ...item.colHeaders, ...item.sessions, ...item.breaks]"
                :col-num="rooms.length + 1"
                :maxRows="item.numCols + 1"
                :row-height="20"
                :is-draggable="false"
                :is-resizable="false"
                :is-mirrored="false"
                :margin="[0, 0]"
                :transformScale="zoomStates[index]"
                :autoSize="false"
                :style="{ width: `${160 * rooms.length}px` }"
                :use-css-transforms="true"
                :vertical-compact="false"
                :prevent-collision="true"
              >
                <grid-item
                  v-for="griditem in [...gridItemRooms, ...item.colHeaders, ...item.sessions, ...item.breaks]"
                  :x="griditem.x"
                  :y="griditem.y"
                  :w="griditem.w"
                  :h="griditem.h"
                  :i="griditem.i"
                  :isResizable="false"
                  :isDraggable="false"
                  :static="true"
                  :maxW="griditem.maxW"
                  :key="griditem.i"
                  class="text-center relative justify-center vue-grid-item text-black"
                  :class="{
                    'bg-gray-500/30 hover:bg-accent-300 border border-gray-600/30 cursor-zoom-in': griditem.type === GridItemTypes.Session,
                  }"
                  :style="griditem.color ? [`background: ${griditem.color}50!important; border-color: ${griditem.color}60!important`] : []"
                  :data-grid-item-type="griditem.type"
                  @click="() => open(griditem)"
                >
                  <p
                    v-if="griditem.type === GridItemTypes.Header"
                    class="relative align-middle -top-3 font-bold"
                  >
                    {{ griditem.label }}
                  </p>
                  <div
                    v-else-if="griditem.type === GridItemTypes.Session || griditem.type === GridItemTypes.Break"
                    class="h-full overflow-clip font-bold flex items-center justify-center text-xl text-gray-700 text-wrap"
                  >
                    <SessionGridCell
                      v-if="griditem.type === GridItemTypes.Session && (griditem as any).session"
                      :session="(griditem as any).session"
                    />
                    <span v-else>{{ griditem.label }}</span>
                  </div>
                </grid-item>
              </grid-layout>

              <h3 v-if="!item.published">Schedule Coming Soon</h3>
            </div>
          </VueZoomable>
        </template>
      </UTabs>
    </div>
  </div>
</template>

<style scoped>
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
  background-size: calc((100% - var(--margin)) / var(--columns)) var(--row-height);
  background-image:
    linear-gradient(to right, rgb(233, 230, 230) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(238, 237, 237) 1px, transparent 1px);
  --s: calc(var(--row-height) * var(--grid-scale));
  --w: 142px;
  --_g: #c3c3c300 90deg, rgb(213, 213, 213) 0;
  --_h: #c3c3c300 90deg, rgb(208, 208, 208) 0;
  background:
    conic-gradient(from 90deg at 2px 2px, var(--_h)) 0 var(--row-height) / var(--w) var(--s),
    conic-gradient(from 90deg at 1px 1px, var(--_g)) 0 var(--row-height) / calc(var(--w)) calc(var(--s) / var(--grid-scale));
}
</style>


<style>
.controll__buttons {
  bottom: auto !important;
  top: 40%;
}

@media (max-width: 640px) {
  .controll__buttons {
    top: 50%;
  }
}
</style>