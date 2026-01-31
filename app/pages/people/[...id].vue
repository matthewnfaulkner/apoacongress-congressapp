<script setup lang="ts">
import type { Person, DirectusUser } from '#shared/types/schema';
import { removeSeconds } from '@/utils/time-utils';
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';
import type { TableColumn, TableRow } from '@nuxt/ui'
const route = useRoute();
const { enabled, state } = useLivePreview();
const { isVisualEditingEnabled, apply, setAttr } = useVisualEditing();
const personUrl = useRequestURL();
const { t } = useI18n();
const previousRoute = useState<string | null>('previousRoute')
    

const items = computed(() => {
  const crumbs = []

  const isSameAsCurrent =
    previousRoute.value === route.fullPath

  if (!isSameAsCurrent && previousRoute.value) {
    crumbs.push({
      label: 'Back',
      icon: 'i-lucide-chevron-left',  
      to: isSameAsCurrent ? undefined : previousRoute.value,
      disabled: isSameAsCurrent,
      class: 'text-accent'
      
    })
  }
  return crumbs
})

const id = route.params.id as string;

const wrapperRef = ref<HTMLElement | null>(null);

const {
	public: { directusUrl },
} = useRuntimeConfig();

// Handle Live Preview adding version=main which is not required when fetching the main version.
const version = route.query.version === 'main' ? undefined : (route.query.version as string);


const { data, error, refresh } = await useFetch<Person>(() => `/api/persons/one`, {
	key: `person-${id}`,
	query: {
		preview: enabled.value ? true : undefined,
		token: enabled.value ? state.token : undefined,
		id: id[0] as string,
		version,
	},
});


if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Person not found', fatal: true });
}

const person = computed(() => data.value);

const person_events = computed(() => 
    person.value?.assignments.flatMap((assignment) => {

        const event = assignment.event;

        if(!event) return;
        const isSubEvent= event.parent ? true : false;
        const session = isSubEvent ? event.parent.session : event.session;
        const room = event?.parent ? session.room : session.room;
        return {
            parent: isSubEvent ? event.parent : null,
            topic: event?.type ? event?.type[0] : {},
            title: isSubEvent ? `${event.title} - ${event.parent.title}` : `${event.title}`, 
            day: session?.schedule?.day?.title,
            startTime: isSubEvent ? 
                addMinutesToTime(
                    session?.starttime || '00:00', 
                    event.parent.relative_start + event.relative_start) 
                : removeSeconds(assignment.event?.session.starttime),
            endTime: isSubEvent ? 
                addMinutesToTime(
                    session.starttime, 
                    event.parent.relative_start + event.relative_start + event?.duration) 
                : addMinutesToTime(session.starttime, event?.duration),
            room: room,
            role: assignment.role?.name,
            link: `/program/day/${session.schedule?.day?.key}?eventId=${event.id}#${room?.id}`
        }
    }
    )
);


const person_committees = computed(() => 
    person.value?.committee_positions.flatMap((position) => 
        position.committee_positions_id
    )
);

onMounted(() => {
	if (!isVisualEditingEnabled.value) return;
	apply({
		onSaved: () => refresh(),
	});
});

useHead({
  title: `${person.value?.first_name} ${person.value?.last_name}`
})

type EventEntry = {
  id: string
  startTime: string | number | null
  endTime: string | null
  topic: string | null | undefined
  role: string[]	 | null | undefined | Assignment[]
  color: string | null | undefined
  room: string
  title: string
  day: string
  link: string,
}

const columns: TableColumn<EventEntry>[] = [
    {
		accessorKey: 'day',
		header: 'Where and When?',
        cell: ({ row }) => {
                const render = `${row.original.day} - ${row.original.startTime} | ${row.original.room.title}`
                return h('div', 
                {
                    class: 'text-wrap'
                },render
            )
		}
	},
	{
		accessorKey: 'title',
		header: 'Title',
        cell: ({ row }) => {
                return h('div', 
                {
                    class: 'text-wrap'
                },
                row.getValue('title')
            )
		}
	},
	{
		accessorKey: 'topic',
		header: 'Details',
        cell: ({ row }) => {
                return h(BaseEventType, 
                {
                type: row.getValue('topic') as {id: string, collection: string, item: []}
                }
            )
		}
	},
	{
		accessorKey: 'role',
        header: 'Role'

	}
]

function onSelect(e: Event, row: TableRow<EventEntry>) {
  const link = row.original.link as string;
  if(link)   navigateTo(link);
}
const rowSelection = ref<Record<string, boolean>>({})

</script>
<template>
	<div v-if="person" ref="wrapperRef">
		<Container class="py-12">
            <UBreadcrumb v-if="items" :items="items"/>
            <UPageCard
					:key="person.id"
					highlight-color="accent"
					orientation="horizontal"
					class="text-center h-full justify-center ring-0"
                    :title="`${person.first_name} ${person.last_name}` || ''" 
					:ui="{
                        title: 'font-heading text-3xl',
						wrapper: 'items-center'
					}"
				>   
                    <template #title>
                        <Tagline v-if="person.title" :tagline="person.title" />
                        <Headline :headline="`${person.first_name} ${person.last_name}` || ''" > </Headline>

                    </template>
                    <template #description>
                        <div v-if="person.qualifications">{{ person.qualifications.join('. ') }}</div>
                        <div v-if="person.bio" v-html="person.bio"></div>
                        <UPageList v-if="person?.affiliations && person?.affiliations.length > 0">
                            <Tagline :tagline="$t('Affiliations')" ></Tagline>
                            <ULink  
                                v-for="(affiliation, index) in person.affiliations" 
                                :to="affiliation.link || ''">
                                <i>{{affiliation.institution}} - {{affiliation.position}}</i></ULink>

                        </UPageList>
                        
                    </template>
						
                        <DirectusImage v-if="person.image"
							:uuid="person.image"
						/>
                        <UIcon v-else name="i-lucide-square-user-round" size="300px" class="text-accent-800"/>

				</UPageCard>
                <UPageList v-if="person.committee_positions.length > 0"  class="p-5">
                                <Tagline :tagline="$t('committees')" ></Tagline>
                                <UPageCard
                                    v-for="(committee_position, index) in person.committee_positions"
                                    :key="index"
                                    variant="outline"
                                    :to="`/committee/${committee_position.committee_positions_id?.committee.slug}`"
                                    class=""
                                    :title="committee_position.committee_positions_id?.title"
                                    :description="committee_position?.committee_positions_id?.committee.title"
                                    :ui="{
                                        body: 'w-full',
                                        container: 'p-2 lg:p-2'
                                    }"
                                    >
                                    </UPageCard>
                        </UPageList>
                        <div v-if="person_events?.length > 0">
                        <Tagline :tagline="$t('Events')"></Tagline>
                        <UTable
                            :data="person_events"
					        :columns="columns"
                            @select="onSelect"
                            v-model:row-selection="rowSelection"
                            :ui="{
                                tr: 'cursor-pointer'
                            }"
                            >
                            
                        </UTable>
                        </div>
		</Container>
	</div>
	<div v-else class="text-center text-xl mt-[20%]">404 - Person Not Found</div>
</template>
