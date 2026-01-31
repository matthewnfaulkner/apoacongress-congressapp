<script setup lang="ts">
import type { Assignment, CongressDay, CongressSession, DirectusUser } from '#shared/types/schema';
import type { TabsItem } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { addMinutesToTime } from '~/utils/time-utils';
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';

const UCheckbox = resolveComponent('UCheckbox')
const UButton = resolveComponent('UButton')
const route = useRoute();
const { enabled, state } = useLivePreview();
const { isVisualEditingEnabled, apply, setAttr } = useVisualEditing();


const slugParam = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug


const {
	public: { directusUrl },
} = useRuntimeConfig();

// Handle Live Preview adding version=main which is not required when fetching the main version.
const version = route.query.version === 'main' ? undefined : (route.query.version as string);


const { data, error, refresh } = await useFetch<CongressSession[]>(() => `/api/program/section`, {
	key: `section-${slugParam}`,
	query: {
		preview: enabled.value ? true : undefined,
		token: enabled.value ? state.token : undefined,
		slug: slugParam,
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

const section = sectionSessions?.value[0]?.section || null;

const sessions: SessionEntry[] =
    sectionSessions?.value?.map((session, index) => ({
		id: session.id,
		time: `${removeSeconds(session.starttime)} - ${removeSeconds(session.endtime)}`,
		topic: `${session.title} - ${session?.room?.title || ''}`,
        day: session?.schedule?.day,
		roles: [''],
		session: session.section?.name,
		color: session.section?.color,
		children: session?.events?.map<EventEntry>(myevent => ({
			id: myevent.id,
			time: addMinutesToTime(session?.starttime || '', (myevent?.relative_start || 0)),
			topic: myevent.type ? myevent.type[0] : {},
			color: session.section?.color,
			roles: myevent.assignments.flatMap(assignment => {
				return assignment;
			}),
			children: myevent.children.map<EventEntry>(child => ({
				id: child.id,
				time: addMinutesToTime(session?.starttime || '', (myevent?.relative_start + child?.relative_start)),
				topic: child.type ? child.type[0] : {},
				color: session.section?.color,
				roles: child.assignments.flatMap(assignment => {
					return assignment
				})
			})) ?? []
		})) ?? []
    }));

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
  day: CongressDay
  time: string | null | undefined
  topic: string | null | undefined
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
		accessorKey: 'topic',
		header: 'Details',
		cell: ({ row }) => {
			const fontWeight =
			row.depth === 0 ? 800 :
			row.depth === 1 ? 600 :
			400;
			if(row.depth == 0){
				return h('div',{
						style: {
							paddingLeft: `${row.depth}rem`,
							fontWeight,
							},
						class: 'w-30 wrap-break-word'}, row.getValue('topic'))
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
		console.log(assignments)
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
// Function to return a class for each row
function getRowClass(row) {
  return `background: ${row.original.color}10!important`;
  return row.isActive ? 'bg-green-100' : 'bg-red-100'
}

</script>
<template>
	<div v-if="sessions" ref="wrapperRef">
		<Container class="py-12">
		<Headline :headline="`Schedule - ${section?.name}`" />
                <div v-for="(day, index) in sessionsByDay" class="py-5">
                    <ULink :to="`/program/day/${day.day.key}`" class="text-2xl text-accent font-heading"> 
                            {{ day.day.title }}
                    </ULink>
                    <UTable
                        :data="day?.sessions"
                        :columns="columns"
                        :get-sub-rows="(row) => row.children"
                        :expanded="true";
                        :meta="{
                            style: {
                                tr: (row) =>
                                    getRowClass(row)
                            }
                            }"
                        class="flex-1"	
                        :ui="{
                            base: 'border-separate border-spacing-0',
                            tbody: '[&>tr]:last:[&>td]:border-b-0',
                            tr: `group`,
                            td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default'
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
	<div v-else class="text-center text-xl mt-[20%]">404 - Section Not Found</div>
</template>
