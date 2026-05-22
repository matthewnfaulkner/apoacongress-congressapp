<script setup lang="ts">
import type { Assignment, CongressDay, CongressSession, DirectusUser, Organisation } from '#shared/types/schema';
import type { TabsItem } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { addMinutesToTime, removeSeconds } from '~/utils/time-utils';
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';


const route = useRoute();
const { enabled, state } = useLivePreview();
const { isVisualEditingEnabled, apply, setAttr } = useVisualEditing();
const pageUrl = useRequestURL();
const siteDataStore = useSiteDataStore();

const site = siteDataStore.siteData as Site;
const congress = site?.congress ? site.congress[0] as Congress : null;
const congressOrganisers = congress?.organisations as CongressOrganisation[] || [];
const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id


const {
	public: { directusUrl },
} = useRuntimeConfig();

// Handle Live Preview adding version=main which is not required when fetching the main version.
const version = route.query.version === 'main' ? undefined : (route.query.version as string);


const { data, error, refresh } = await useFetch<CongressSession[]>(() => `/api/program/section`, {
	key: `section-${id}`,
	query: {
		preview: enabled.value ? true : undefined,
		token: enabled.value ? state.token : undefined,
		id: id,
		version,
	},
});

if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Section not found', fatal: true });
}



const sectionSessions = computed(() => data.value);

if (!sectionSessions.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Section not found', fatal: true });
}


const section = congressOrganisers.find((o) => (o?.organisation as Organisation).id == id)?.organisation as Organisation;


useSeoMeta({
	title: section.short_name + ' Schedule',
	description:  '',
	ogTitle: section.short_name + ' Schedule - ' + site.title,
	ogDescription: '',
	ogUrl: pageUrl.toString(),
});

const sessions: SessionEntry[] =
    sectionSessions?.value?.map((session, index) => {
		const rawTags = (session.tags as any[]) ?? []
		const firstTagId = rawTags.length > 0 ? (rawTags[0]?.key ?? rawTags[0]?.id ?? rawTags[0]) : null
		const tagColor = firstTagId ? (siteDataStore.scientificTags.find(t => t.id === firstTagId)?.color ?? null) : null
		const tagName = rawTags
			.map(raw => raw?.key ?? raw?.id ?? raw)
			.map(id => siteDataStore.scientificTags.find(t => t.id === id)?.tag)
			.filter(Boolean)
			.join(', ')
		return ({
		id: session.id,
		time: `${removeSeconds(session.starttime)} - ${removeSeconds(session.endtime)}`,
		topic: { label: session.title ?? '', tagName, roomTitle: (session as any)?.room?.title ?? '' },
        day: session?.schedule?.day,
		roles: [''],
		session: session.id,
		color: tagColor,
		room: (session?.rooms as CongressSessionRoom[]).map((room) => (room.room as VenueRoom).title),
		children: session?.events?.map<EventEntry>(myevent => ({
			id: myevent.id,
			time: addMinutesToTime(session?.starttime || '', (myevent?.relative_start || 0)),
			topic: myevent.type ? myevent.type[0] : {},
			color: tagColor,
			roles: myevent.assignments.flatMap(assignment => {
				return assignment;
			}),
			children: myevent.children.map<EventEntry>(child => ({
				id: child.id,
				time: addMinutesToTime(session?.starttime || '', (myevent?.relative_start + child?.relative_start)),
				topic: child.type ? child.type[0] : {},
				color: tagColor,
				roles: child.assignments.flatMap(assignment => {
					return assignment
				})
			})) ?? []
		})) ?? []
    })});


interface DaySessions {
  dayId: number | string;
  day: SessionEntry['day'];
  sessions: SessionEntry[];
}

const sessionsByDay = Object.values(
  sessions.reduce<Record<string | number, DaySessions>>((acc, session) => {
    const dayId = session.day?.id;

    if (!dayId) return acc;

    if (!acc[dayId]) {
      acc[dayId] = {
        dayId,
        day: session.day,
        sessions: []
      };
    }

    acc[dayId].sessions.push(session);

    return acc;
  }, {})
);

    
type SessionEntry = {
  id: string
  day?: CongressDay
  time: string | null | undefined
  topic: { label: string; orgNames: string; tagName: string; roomTitle: string }
  roles: string[] | null | undefined
  session: string;
  color: string | null | undefined
  children?: EventEntry[]
}

type EventEntry = {
  id: string
  time: string | number | null
  topic: string | null | undefined
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
			class: 'flex items-center gap-2 w-10 text-xs text-wrap'
			},
			[
			
			row.getValue('time') as string
			]
		)
		}
	},
	{
		accessorKey: 'room',
		header: 'Room',
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
				const topic = row.getValue('topic') as SessionEntry['topic']
				return h('div', {
						style: { paddingLeft: `${row.depth}rem`, fontWeight },
						class: 'flex flex-col wrap-break-word text-wrap'
					}, [
						h('span', topic.label),
						topic.tagName ? h('i', { class: 'text-sm font-normal text-gray-500' }, `Tags: ${topic.tagName}`) : null,
					].filter(Boolean)
				)
			}else{
				 return h(BaseEventType, 
					{
						style: {
							paddingLeft: `${row.depth}rem`,
							fontWeight,
							},
					type: row.getValue('topic') as {id: string, collection: string, item: []}
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
				{ class: 'text-left font-medium text-wrap' },
				
				assignments.map(a => h('div', {class: 'text-wrap', a}))
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

function getRowClass(row) {
  const classes: string[] = [];
  if (row.original.active) classes.push('ring ring-2 ring-secondary/50 animate-pulse');
  return classes.join(' ') || undefined;
}

// Function to return a class for each row
function getRowStyle(row) { 
	if (row.depth === 0) return `background: ${row.original.color}30!important`;
	return`background: ${row.original.color}15!important`;
}
</script>
<template>
	<div v-if="sessions" ref="wrapperRef">
		<Container class="py-12">
		<Headline :headline="`Schedule - ${section?.short_name}`" />
                <div v-for="(day, index) in sessionsByDay" class="py-5">
                    <ULink :to="`/program/day/${day.day.key}`" class="text-2xl text-accent font-heading"> 
                            {{ day.day.title }}
                    </ULink>
                    <UTable
                        :data="day?.sessions"
                        :columns="columns"
                        :get-sub-rows="(row) => row.children"
                        :expanded="true";
                        class="flex-1"	
                        :ui="{
                            base: 'border-separate border-spacing-0',
                            tbody: '[&>tr]:last:[&>td]:border-b-0 font-serif',
                            tr: `group`,
                            td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default'
                        }"
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
                    >
                    <template #roles-cell="row" >
                        <div v-for="speaker in row.getValue()" class="text-left text-wrap">
                            <ULink v-if="speaker?.person" :to="`/people/${speaker?.person.id}`">
                                {{speaker.role.name}}: <b>{{ speaker.person.first_name }} {{ speaker.person.last_name }} </b>
                            </ULink>
                        </div>
                    </template>
                    </UTable>
                </div>
		</Container>
	</div>
	<div v-else>
		<div class="text-center text-xl mt-[20%] w-full text-center">
			<p class="text-center m-2">Schedule Coming Soon</p>
			<UButton class="m-auto p-2" label="Get Notifed" color="accent" variant="solid" to="/register-interest" />
		</div>
	</div>
</template>
