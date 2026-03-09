<script setup lang="ts">
import type { Person, DirectusUser } from '#shared/types/schema';
import { removeSeconds } from '@/utils/time-utils';
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';
import type { TableColumn, TableRow } from '@nuxt/ui'
import { readMe, updateMe } from '@directus/sdk';
import * as z from 'zod'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { ConfirmationModal } from "~/components/ui/modal";
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';



const toast = useToast();
const route = useRoute();
const { isVisualEditingEnabled, apply, setAttr } = useVisualEditing();
const personUrl = useRequestURL();
const { t } = useI18n();
const previousRoute = useState<string | null>('previousRoute')
const { $directus } = useNuxtApp();
const config = useRuntimeConfig();

const overlay = useOverlay()
const confirmationModal = overlay.create(ConfirmationModal);
const ready = ref(false);

const auth = await useAuthStore();

const isLoggedIn = computed(() =>
  auth.isAuthenticated !== false
)

if(!isLoggedIn) {
    navigateTo('/login?redirect=/profile');
}

const personFields = [
    '*',
    {
        person : [
            'id',
            'country',
            'first_name',
            'last_name',
            'title',
            'qualifications',
            'image',
            'bio',
            'affiliations',
            {
                committee_positions:[
                    {
                        committee_positions_id: [
                            'title',
                        {
                            committee: [
                                'title',
                                'congress',
                                'slug',
                            ]
                        }
                        ] 
                    }
                ]
            },
            {
                assignments: [
                    'id',
                    {
                        event: [
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
                                        'id',
                                        'topic'
                                        ],
                                        symposiums: [
                                        '*'
                                        ],
                                        workshops: [
                                        'id',
                                        
                                        ],
                                        talks: [
                                        'id',
                                        'topic'
                                        ],
                                    }
                                    },
                                ]
                            },
                            {
                                parent: [
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
                                                'id',
                                                'topic'
                                                ],
                                                symposiums: [
                                                '*'
                                                ],
                                                workshops: [
                                                'id',
                                                
                                                ],
                                                talks: [
                                                'id',
                                                'topic'
                                                ],
                                            }
                                            },
                                        ]
                                    },
                                    {
                                        session: [
                                        '*',
                                        {
                                            schedule: [
                                                    '*',
                                                    {
                                                        day: [
                                                            '*'
                                                        ]
                                                    }
                                                ]
                                        },
                                        {
                                            room: [
                                                '*'
                                            ]
                                        },
                                        {
                                            section: [
                                                '*'
                                            ]
                                        }
                                    ]
                                }
                                ]
                                
                            },
                            {
                                session: [
                                    '*',
                                    {
                                        schedule: [
                                            '*',
                                            {
                                                day: [
                                                    '*'
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        room: [
                                            '*'
                                        ]
                                    },
                                    {
                                        section: [
                                            '*'
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        role: [
                            '*'
                        ]
                    }
                ]
            }
        ]
    }
	
];

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

const profile = ref<DirectusUser>();

const {
	public: { directusUrl },
} = useRuntimeConfig();

watch(
  ready,
  async (ready) => {
    if (!ready) return
    const { data } = await useAsyncData <DirectusUser>('profile', async() => {
        return await $directus.request<DirectusUser>(readMe(
            {   
                fields: personFields,
                deep: {
                        person: {
                            _limit: 1,
                            committee_positions: {
                                _filter: {
                                    committee_positions_id: {
                                        committee: {
                                            congress: {
                                                site:{
                                                    _eq: config.public.siteId
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            assignments: {
                                _filter: {
                                    event: {
                                        _or: [
                                            {
                                        session: {
                                            schedule: {
                                                day: {
                                                    congress: {
                                                        site:{
                                                            _eq: config.public.siteId
                                                            }
                                                        }
                                                }
                                            },
                                        }},
                                        {parent: {
                                            session: {
                                                schedule: {
                                                    day: {
                                                        congress: {
                                                            site:{
                                                            _eq: config.public.siteId
                                                                }
                                                            }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    ]
                                    }
                            }
                        }
                        }
                        }
            
            }
        ))})
        
    profile.value = data.value;
    person.value = profile.value?.person as Person;
})

const person = ref<Person | null>();



const person_events = computed(() => person.value ? 
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
    ) : []
);


const person_committees = computed(() => person ? 
    person.value?.committee_positions.flatMap((position) => 
        position.committee_positions_id
    ) : []
);

onMounted(() => {
	if (!isVisualEditingEnabled.value) return;
	apply({
		onSaved: () => refresh(),
	});
});

useHead({
  title: `My Profile`
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

const state = reactive({
    person: {
        id: undefined,
        name: undefined
    }
})
const schema = z.object({
    person: z.object({
                id: z.string(),
                name: z.string(),
     })
});

type Schema = typeof schema

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	try {
        const formData = submission.data as Schema;
        
        const response = await $directus.request(updateMe(
            {
                person: formData?.person?.id,
            }
        ))

        reloadNuxtApp();

    } catch (error){
        console.log(error)
    }
}


const disassociatePerson = async () => {
    if (person.value){
        const instance = confirmationModal.open({
        title: "Confirm.",
        helpMessage: "This action will unlink your profile from ",
        helpMessageData: `${person.value?.first_name} ${person.value?.last_name}`,
        })

        
        await instance.result.then(
            (result: boolean) =>  {
                if(result) {
                try{
                    const response = $directus.request(updateMe(
                        {
                            person: null
                        }
                    ))

                    person.value = null
                    
                    toast.add({ title: 'Success', description: 'Person Unlinked', color: 'accent'})

                } catch (e) {
                    console.log(e)
                }
                }
            }
        )
    }
    return;
}


onMounted(async () => {
  // if your store has a fetch method, call it here
  ready.value = true
})

</script>
<template>
    {{ profile?.person }}
    {{ person }}
	<div  ref="wrapperRef">
		<Container class="py-12">
            <Headline headline="Congress Profile" class="text-accent text-center"/>
            <div v-if="profile?.person" >
                <div class="w-full flex flex-col justify-center">
                    <UButton label="Not You?" color="accent" class="w-30 m-auto justify-center text-xl" @click="disassociatePerson"/>
                </div>
                <UPageCard
                    v-if="person"
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
                            class="w-50 m-auto"
						/>
                        <UIcon v-else name="i-lucide-square-user-round" size="300px" class="text-accent-800"/>

				</UPageCard>
                <UPageList v-if="person.committee_positions && person.committee_positions.length > 0"  class="p-5">
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
            </div>
            <div v-else class="text-center text-xl flex-column">
                <p>No Congress Profile link with your account.</p>
                <small >
                    You can link your user profile with a facaulty profile. <br>
                    That way you'll be able to track any events you are participating in. <br>
                    Find your self in the list below, and click "Link Profile".
                </small>
                <UForm :state="state" :schema="schema"  @submit="handleSubmit" class="m-10">
                    <UFormField name="person" class="w-50 m-auto" orientation="horizontal">
                        <PersonSelectMenu :allow-add=false :default-value="null" size="lg" @value-updated="(updatedItem) => {state.person = updatedItem}"/> 
                    </UFormField>
                    <UButton type="submit" color="accent" variant="solid" label="Link Profile" class="m-2">
                    </UButton>
                </UForm>
            </div>

		</Container>
	</div>
	
</template>
