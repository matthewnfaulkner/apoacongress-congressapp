<script setup lang="ts">
import { type scheduleGridItem, GridItemTypes } from '@/types/grid-types';
import { readItems, deleteItem } from '@directus/sdk';
import type { TableColumn } from '@nuxt/ui'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { ConfirmationModal } from "~/components/ui/modal";
import type { Row, TableMeta } from '@tanstack/vue-table'
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';

const overlay = useOverlay()


const confirmationModal = overlay.create(ConfirmationModal);

const { $directus, $isAuthenticatedWithPolicy } = useNuxtApp();

const isAuthenticated = await $isAuthenticatedWithPolicy('Schedule - Editor');

const toast = useToast();

const props = defineProps<{
  x: number | string;
  y: number | string;
  rooms: VenueRoom[] | undefined;
  allRooms?: VenueRoom[];
  startTime: string | null;
  endTime: string | null;
  session: CongressSession;
  events?: CongressEvent[]
  day?: string;
  schedule?: string;
  timeSubDivision: number,
  yLimit: number,
  label: string,
}>()

const emit = defineEmits<{ 
        close: [boolean,scheduleGridItem?],
    }>()

const label = ref('');
label.value = props?.label || '';

const session = ref<CongressSession>();
session.value = props.session;

const { organisationNames, firstTag } = useSessionLabel(session)


const toUpdate = ref(false);

const { data } = await useAsyncData <CongressEvent[]>('congress_events', async() => {
      return await $directus.request<CongressEvent[]>(readItems(
        'congress_events',
        {   
            fields: [
									'id',
									'title',
									'relative_start',
									'duration',
									{
									children: [
										'id',
										'title',
										'relative_start',
										'duration',
										{
                      type: [
                        'id',
                        'collection',
                        {
                          item: {
                            plenaries: [
                              '*'
                            ],
                            symposiums: [
                              '*'
                            ],
                            workshops: [
                              '*'
                            ],
                            talks: [
                              '*'
                            ],
                          }
                        },
                      ]
                    },
										{
											assignments: [
                          'id',
													{
														person: [
															'id',
															'first_name',
															'last_name'
														]
													},
													{
														role: [
															'id',
															'name'
														]
													}
											]
										}
									]
								},
									{
										type: [
											'id',
											'collection',
											{
												item: {
                          plenaries: [
                            '*'
                          ],
                          symposiums: [
                            '*'
                          ],
                          workshops: [
                            '*'
                          ],
                          talks: [
                            '*'
                          ],
                        }
											},
										]
									},
									{
										assignments: [
                      'id',
												{
													person: [
														'id',
														'first_name',
														'last_name'
													]
												},
												{
													role: [
														'id',
														'name'
													]
												}
										]
									}
								],
            filter: {
              session: {
                  _eq: props.session?.id 
              },
            },
            sort: 'relative_start',
            deep: {
                children: {
                    _sort: 'relative_start'
                },
            },
          
        }
    ))})


if(!data.value) {
    console.log("No Events")  
}
const events = ref<CongressEvent[]>([])

events.value = data.value;

const newItem : scheduleGridItem = {
    x: props.x as number,
    y: props.y as number,
    w: 1,
    h: 1,
    i: props.room?.id + "",
    label: `newitem`,
    static: false,
    isResizable: true,
    isDraggable: true,
    type: GridItemTypes.Session,
    color: '#000'
}

const eventItems = computed(() => {
  return events.value?.map((event) => ({
    label: event.title,
    startTime: addMinutesToTime(props.session?.starttime, event.relative_start),
    endTime: addMinutesToTime(props.session?.starttime, event.duration),
    defaultExpanded: true,
    id: event.id,
    title: event?.title,
    topic: event?.type[0],
    event: event,
    roles: event.assignments.flatMap(assignment => {
					return assignment
				}),
    children: event?.children?.map((childevent) => ({
      startTime: addMinutesToTime(props.session?.starttime, event.relative_start + childevent.relative_start),
      endTime: addMinutesToTime(props.session?.starttime, event.relative_start + childevent.relative_start),
      label: childevent.title,
      parent: event,
      event: childevent,
      defaultExpanded: true,
      id: childevent.id,
      title: childevent?.title,
      topic: childevent?.type[0],
      roles: childevent.assignments.flatMap(assignment => {
					return assignment
				})
    })) || []
  }))
})

interface EventEntry {
    id: string;
    title: string;
    topic: string;
    startTime: string;
    endTime: string;
    children: EventEntry[];
    roles: Assignment[];
    session: CongressSession | null;
    parent: CongressEvent | null;
    event: CongressEvent | null;
}


const columns: TableColumn<EventEntry>[] = [
  ...(isAuthenticated ? [
    {
    id: 'actions',
    meta: {
      class: {
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      return h(
        UDropdownMenu,
        {
          content: {
            align: 'end'
          },
          items: getRowItems(row),
          'aria-label': 'Actions dropdown'
        },
        () =>
          h(UButton, {
            icon: 'i-lucide-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost',
            'aria-label': 'Actions dropdown'
          })
      )
    }
  },
  ] : []),
  
	{
		accessorKey: 'startTime',
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
            paddingLeft: `${row.depth}rem`
          },
          class: 'flex items-center gap-2'
        },
        [
          h(UButton, {
            color: 'neutral',
            variant: 'outline',
            size: 'xs',
            icon: row.getIsExpanded() ? 'i-lucide-minus' : 'i-lucide-plus',
            class: !row.getCanExpand() && 'invisible',
            ui: {
              base: 'p-0 rounded-sm',
              leadingIcon: 'size-4'
            },
            onClick: row.getToggleExpandedHandler()
          }),
          row.getValue('startTime') as string
        ]
      )
		}
	},

	{
		accessorKey: 'topic',
		header: 'Topic',
    cell: ({row}) => {
      return h(BaseEventType, 
        {
          type: row.getValue('topic') as {id: string, collection: string, item: []}
        }
      )
    }
	},
	{
		accessorKey: 'roles',
		header: () => h('div', { class: 'text-left' }, 'Roles'),
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

const meta: TableMeta<EventEntry> = {
  class: {
    tr: (row: Row<EventEntry>) => {
      if (row.depth > 0) {
        return 'bg-secondary/5'
      }
    }
  }
}

function getRowItems(row: Row<EventEntry>) {
  const actions = [
    {
      label: 'Edit Event',
      icon: 'i-lucide-wrench',
      onSelect() {
        row.depth <= 0 ? openEditEventModal('update', row.original) : openEditSubEventModal('update', row.original.parent, row.original)
      }
    },
    {
      label: 'Delete Event',
      icon: 'i-lucide-trash',
      disabled: row.original.children && row.original.children.length > 0  ? true : false,
      async onSelect() {
        const instance = confirmationModal.open({
          title: "Confirm Delete.",
          helpMessage: "This action is irreversible, are you sure you want to delete?",
          helpMessageData: row.original.label || '',
        })

        await instance.result.then((result) => {if(result) deleteEvent(row.original.id, row.original.parent)})
      }
    }
  ];

  return row.depth > 0 ? actions : [
    ...actions,     
    {
      label: 'Add Sub-Event',
      icon: 'i-lucide-plus',
      onSelect() {
        openEditSubEventModal('create', row.original.event, null);
      }
    }
  ]
}


</script>

<template>
  
  <UModal
    v-model:open="open"
    :close="{ onClick: () => emit('close', toUpdate) }"
  >
  
    <template #title class="block">
      <p class="p-0 m-0 text-accent">{{ props.rooms?.map((room) => room.title).join(' + ') }}</p>
      <p v-if="organisationNames" class="text-md text-secondary">{{ organisationNames }}</p>

      <p class="text-2xl">
        {{ label }}
      </p>
      <i v-if="firstTag" class="text-sm text-muted">Tag: {{ firstTag }}</i>
      <p class="text-muted">{{ startTime }} : {{ endTime }} - {{ day }}</p>
    </template>
    <template #body>
         <UTable  
            v-model:expanded="expanded"
            :data="eventItems"
            :columns="columns"
            :get-sub-rows="(row) => row.children"
            class="flex-1"
            :meta="meta"
            :ui="{
              base: 'border-separate border-spacing-0',
              tbody: '[&>tr:last-child>td]:border-b-0',
              tr: 'group expanded:bg-black',
              td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
            }"
          >
          <template #roles-cell="row" >
              <div v-for="speaker in row.getValue()" class="text-left text-pretty">
                  <ULink v-if="speaker?.person" :to="`/people/${speaker?.person.id}`" @click="() => {open.value = false}">
                      {{speaker.role.name}}: 
                      
                      <b v-if="speaker.person.first_name ">{{ speaker.person.first_name }} {{ speaker.person.last_name }} </b>
                      <b v-else>{{ speaker.person.name }} </b>

                  </ULink>
              </div>
          </template>
          <!--<template #expanded="{ row }">
                <div class="hidden">
              <UButton color="accent" icon="i-lucide-plus" class="w-full justify-center" @click="openEventModal = true"/>
              </div>
          </template>-->
        </UTable>
    </template>
    <template #footer>
    </template>
      
  </UModal>
</template>
