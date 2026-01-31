<script setup lang="ts">
import { type scheduleGridItem, GridItemTypes } from '@/types/grid-types';
import { readItems, deleteItem } from '@directus/sdk';
import type { TableColumn } from '@nuxt/ui'
import EditModal from "~/components/grid/EditModal.vue";
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { ConfirmationModal } from "~/components/ui/modal";
import EditEventModal from "~/components/grid/EditEventModal.vue";
import type { Row, TableMeta } from '@tanstack/vue-table'
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';
import { DateTime } from "luxon";
import { disable } from '@directus/visual-editing';
const { $directus } = useNuxtApp();
const toast = useToast();

const siteDataStore = useSiteDataStore();

const siteData = siteDataStore.getSiteData();
const timezone = siteData.congress[0]?.timezone || 'Asia/Kuala_Lumpur';
let dateTime = new Date()
const time = DateTime.now().hour * 60 + DateTime.now().minute;
const hour = DateTime.now(timezone).setZone(timezone).hour;
const minute = DateTime.now(timezone).setZone(timezone).minute;
const { data } = await useAsyncData <CongressSession[]>('congress_sessions', async() => {
      return await $directus.request<CongressSession[]>(readItems(
        'congress_sessions',
        {   
            fields: [
                'hour(endtime)', 
                'minute(endtime)',
                {
                    schedule: [
                        {
                        day: [
                            'year(date)'
                        ]
                    }
                    ]
                }
            ], 
            filter: {
                id: {
                    _eq : 'ea4e2a4a-1656-4821-9ce6-ebc5a725516b'
                },
                _and: [
                    {   
                        _or: [
                            {
                                'hour(endtime)':
                                    {
                                        _gt: hour
                                    },
                            },
                            {   
                                _and: [
                                    {
                                         'hour(endtime)':
                                         {
                                            _eq: hour
                                         }
                                    },
                                    {
                                        'minute(endtime)':
                                        {
                                            _gte: minute
                                        },
                                    }
                                ]
                               
                            },
                        ]
                    },
                    {   
                        _or: [
                            {
                                'hour(starttime)':
                                    {
                                        _lt: hour
                                    },
                            },
                            {   
                                _and: [
                                    {
                                         'hour(starttime)':
                                         {
                                            _eq: hour
                                         }
                                    },
                                    {
                                        'minute(starttime)':
                                        {
                                            _lte: minute
                                        },
                                    }
                                ]
                               
                            },
                        ]
                    },
                ],
                schedule: {
                    day: {
                        _and: [
                            {
                                date: {
                                    _gte: "$NOW"
                                },
                            },  
                            {
                                date: {
                                    _lte: "$NOW(+1 day)"
                                },
                            }
                        ]
                    }
                }
            },
            sort: 'starttime',
            deep: {
                events: {
                    _sort: 'relative_start'
                },
            },
          
        }
    ))})


if(!data.value) {
    console.log("No Events")
    
}
const sessions = ref<CongressSession[]>([])

sessions.value = data.value || [];


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
    accessorKey: 'title',
    header: 'Title'
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


</script>

<template>
 <div>

    {{ hour }}{{ minute }}
    {{ sessions }}
 </div>

</template>
