<script setup lang="ts">
import type { Assignment, CongressDay, Organisation } from '#shared/types/schema';
import type { TabsItem } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { addMinutesToTime, removeSeconds } from '~/utils/time-utils';
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';

const UCheckbox = resolveComponent('UCheckbox')
const UButton = resolveComponent('UButton')
const route = useRoute();
const { enabled, state } = useLivePreview();
const { isVisualEditingEnabled, apply, setAttr } = useVisualEditing();
const siteDataStore = useSiteDataStore();

import { withLeadingSlash, withoutTrailingSlash } from 'ufo';
const personUrl = useRequestURL();


const permalink = withoutTrailingSlash(withLeadingSlash(route.path));
const whichday = permalink.split('/').at(-1);
const eventId = route.query.eventId;
const {
	public: { directusUrl },
} = useRuntimeConfig();

// Handle Live Preview adding version=main which is not required when fetching the main version.
const version = route.query.version === 'main' ? undefined : (route.query.version as string);

const { data, error, refresh } = await useFetch<CongressDay>(() => `/api/program/day`, {
	key: `day-${permalink}`,
	headers: useRequestHeaders(['cookie']),
	query: {
		preview: enabled.value ? true : undefined,
		token: enabled.value ? state.token : undefined,
		key: whichday,
		version,
	},
});


if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Day not found', fatal: true });
}

const day = computed(() => data.value);

const rooms = day?.value?.congress?.venue?.rooms || [];

const hashRoom = rooms?.findIndex(room => room.id == route.hash.slice(1));
const targetTab = hashRoom != -1 ? hashRoom : 0;

const tabs: TabsItem[] = rooms.map(room => {
  const rawSessions = day?.value?.schedules
    ?.flatMap(schedule => schedule.sessions ?? [])
    .filter(session => (session?.rooms as any[] | null)?.some(r => (typeof r.room === 'object' ? r.room?.id : r.room) === room.id))
    ?? []

  const rawBreaks = day?.value?.schedules
    ?.flatMap(schedule => (schedule as any).breaks ?? [])
    .filter((b: any) => (b?.rooms ?? []).some((r: any) => r.room === room.id))
    ?? []

  const combined = [
    ...rawSessions.map(s => ({ type: 'session' as const, starttime: s.starttime || '', data: s })),
    ...rawBreaks.map((b: any) => ({ type: 'break' as const, starttime: b.starttime || '', data: b })),
  ].sort((a, b) => a.starttime.localeCompare(b.starttime))

  const sessions: SessionEntry[] = combined.map(item => {
    if (item.type === 'break') {
      const b = item.data as any
      return {
        id: b.id,
        time: `${removeSeconds(b.starttime)} - ${removeSeconds(b.endtime)}`,
        topic: { label: b.name || 'Break', orgNames: '', tagName: '', static: true, link: null },
        roles: [],
        session: '',
        color: '#fbbf24',
        children: [],
      } as SessionEntry
    }

    const session = item.data

    const orgNames = ((session.organisers as CongressSessionOrganiser[]) ?? [])
      .map(o => {
		const organisation = o.organisation as Organisation;
		return organisation?.name ?? organisation?.short_name ?? organisation?.abbr ?? ''
		})
      .filter(Boolean)
      .join(', ')
    const rawTags = (session.tags as any[]) ?? []
    const firstTagId = rawTags.length > 0 ? (rawTags[0]?.key ?? rawTags[0]?.id ?? rawTags[0]) : null
    const tagColor = firstTagId ? (siteDataStore.scientificTags.find(t => t.id === firstTagId)?.color ?? null) : null
    const tagName = rawTags
      .map(raw => raw?.key ?? raw?.id ?? raw)
      .map(id => siteDataStore.scientificTags.find(t => t.id === id)?.tag)
      .filter(Boolean)
      .join(', ')
    return {
      id: session.id,
      time: `${removeSeconds(session.starttime)} - ${removeSeconds(session.endtime)}`,
      topic: {
        label: session?.title ?? '',
        orgNames,
        tagName,
        static: false,
        //link: sectionAbbr ? `/program/section/${sectionAbbr}` : null
      },
      roles: [''],
      session: orgNames,
      color: tagColor,
      children: session?.events?.map<EventEntry>(myevent => ({
        id: myevent.id,
        time: addMinutesToTime(session?.starttime || '', myevent?.relative_start || 0),
        topic: myevent,
        color: tagColor,
        active: eventId === myevent.id,
        roles: myevent.assignments.flatMap(assignment => assignment),
        children: myevent.children?.map<EventEntry>(child => ({
          id: child.id,
          active: eventId === child.id,
          time: addMinutesToTime(session?.starttime || '', (myevent?.relative_start || 0) + (child?.relative_start || 0)),
          topic: child,
          color: tagColor,
          roles: child.assignments.flatMap(assignment => assignment)
        })) ?? []
      })) ?? []
    }
  })


  return {
    label: room?.title || '',
    value: room.id,
    sessions, // ✅ custom field (allowed by index signature)
  }
})
const tabRefs = ref({});
const setTabRef = (el, name) => {
  if (el) tabRefs.value[name] = el
}

const tabsArray: TabsItem[] = Object.values(tabs)
const activeTab = ref(tabs[targetTab]?.value);  

type SessionEntry = {
  id: string
  time: string | null | undefined
  topic: { label: string; orgNames: string; tagName: string; static: boolean; link: string | null }
  roles: string[] | null | undefined
  session: string;
  color: string | null | undefined;
  children?: EventEntry[]
  active?: boolean
}

type EventEntry = {
  id: string
  time: string | number | null
  topic: CongressEvent | null | undefined
  roles: string[]	 | null | undefined | Assignment[]
  color: string | null | undefined;
  children?: EventEntry[]
}

const columns: TableColumn<SessionEntry>[] = [
	{
		accessorKey: 'time',
		header: 'Time',
		cell: ({ row }) => {
			const fontWeight =
			row.depth === 0 ? 800 :
			row.depth === 1 ? 600 :
			400
		return h(
			'div',
			{
			style: {
				paddingLeft: `${row.depth}rem`,
				fontWeight
			},
			class: 'flex items-center gap-2 w-10 text-xs lg:text-md wrap-break-word text-wrap'
			},
			[
			
			row.getValue('time') as string
			]
		)
		}
	},
	{
		accessorKey: 'topic',
		header: 'Details',
		cell: ({ row }) => {
			const fontWeight =
			row.depth === 0 ? 800 :
			row.depth === 1 ? 600 :
			400;
			if(row.depth == 0){
				const topic = row.getValue('topic') as {label?: string, link?: string, orgNames?: string, tagName?: string};
				return h('a', {
						style: { paddingLeft: `${row.depth}rem`, fontWeight },
						class: 'flex flex-col wrap-break-word text-wrap ',
						href: topic?.link
					}, [
						topic?.orgNames ? h('span', { class: 'text-sm font-normal text-gray-500' }, topic.orgNames) : null,
						h('span', topic?.label),
						topic?.tagName ? h('i', { class: 'text-sm font-normal text-gray-500' }, `Tags; ${topic.tagName}`) : null,
					].filter(Boolean)
				)
			}else{
				 return h(BaseEventType,
					{
						class: 'wrap-break-word text-wrap',
						style: {
							paddingLeft: `${row.depth}rem`,
							fontWeight,
							},
					event: row.getValue('topic') as CongressEvent
					}
				)
			}
		}
	},
	{
		accessorKey: 'roles',
		header: () => h('div', { class: 'text-left' }, 'People'),
		cell: ({ row }) => {
		
		const assignments = row.getValue('roles') as Assignment[];
		
		return h(
				'div',
				{ class: 'text-left font-medium' },
				
				assignments.map(a => h('div', a))
				)
		}
	}
]

onMounted(() => {
	if (!isVisualEditingEnabled.value) return;
	apply({
		onSaved: () => refresh(),
	});
});
// Function to return a class for each row
function getRowStyle(row) { 
	if (row.depth === 0) return `background: ${row.original.color}30!important`;
	return`background: ${row.original.color}15!important`;
}

function getRowClass(row) {
  const classes: string[] = [];
  if (row.original.active) classes.push('ring ring-2 ring-secondary/50 animate-pulse');
  return classes.join(' ') || undefined;
}

const on2ndRow = ref(false);

function model(event) {
	const refEl = tabRefs.value[event];
	const parent = refEl.parentElement.parentElement;
	on2ndRow.value = parent.offsetTop > 10
}

</script>
<template>
	<div v-if="day" ref="wrapperRef">
		<Container class="py-12">
		<Headline :headline="day.title" />
           <UTabs :items="tabsArray" v-model="activeTab" :unmountOnHide="false" 
      		color="accent"
			@update:model-value="model($event)"
			@vue:mounted="model(activeTab)"
			:ui="{
				list: 'flex flex-wrap  sm:flex-nowrap',
				indicator: `h-8 ${on2ndRow ? 'top-auto' : ''}`
			}"
		>	
			<template #default="{ item, index}">
				<div :ref="el => setTabRef(el, item.value)" >{{ item.label }}</div>
			</template>
			<template #content="{ item,  index }">
				<UTable
					:data="item.sessions"
					:columns="columns"
					:get-sub-rows="(row) => (row.children as any)"
					:expanded="true";
					:meta="{
						style: {
							tr: (row) =>
								getRowStyle(row)
						},
						class: {
							tr: (row) => 
								getRowClass(row) || null
						},
						
					}"
					class="flex-1 font-serif"	
					:ui="{
						base: 'border-separate border-spacing-0',
						tbody: '[&>tr]:last:[&>td]:border-b-0',
						tr: `group`,
						td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default'
					}"
				>
				<template #topic-acell="row" >
						<ULink  v-if="row.getValue()" :to="`/program/section/${row.getValue().slug}`">
							{{row.getValue().name}}
						</ULink>
				</template>
				<template #roles-cell="row" >
					<div v-for="speaker in row.getValue()" class="text-left text-wrap">
						<ULink v-if="speaker?.person" :to="`/people/${speaker?.person.id}`">
							{{speaker.role.name}}: <b>{{ speaker.person.first_name }} {{ speaker.person.last_name }} </b>
						</ULink>
					</div>
				</template>
				</UTable>
			</template>
		</UTabs>
		</Container>
	</div>
	<div v-else class="text-center text-xl mt-[20%]">Schedule Unavailable</div>
</template>
