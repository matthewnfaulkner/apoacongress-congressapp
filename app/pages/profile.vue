<script setup lang="ts">
import type { Person, DirectusUser } from '#shared/types/schema';
import { removeSeconds } from '@/utils/time-utils';
import BaseEventType from '~/components/eventTypes/BaseEventType.vue';
import type { TableColumn, TableRow, DropdownMenuItem } from '@nuxt/ui'
import { readMe, updateMe, uploadFiles } from '@directus/sdk';
import * as z from 'zod'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { ConfirmationModal } from "~/components/ui/modal";
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { useClipboard } from '@vueuse/core';



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

const profileMenuItems = ref<DropdownMenuItem[]>([
    {
        label: 'Policy Agreements',
        icon: 'i-lucide-shield-check',
        to: '/policy',
    },
    {
        label: 'Request My Data',
        icon: 'i-lucide-download',
        to: '/mydatarequests',
    },
])

interface QuickLinkCard {
    to: string
    title: string
    description: string
    icon: string
    highlight?: boolean
}

const quickLinkCards: QuickLinkCard[] = [
    {
        to: '/program/planner',
        title: 'View Program',
        description: 'Browse the congress schedule and plan which sessions to attend.',
        icon: 'i-lucide-calendar-days',
    },
    {
        to: '/abstracts/submission',
        title: 'Submit / Manage an Abstract',
        description: 'Share your research and contribute to the scientific programme.',
        icon: 'i-lucide-file-text',
    },
    {
        to: '/host/travel',
        title: 'Travel Advice',
        description: 'Get information on flights, visas, and getting to the congress.',
        icon: 'i-lucide-plane',
    },
    {
        to: '/registration/congress',
        title: 'Register for Congress',
        description: 'Secure your place at APOA 2026 in Taiwan.',
        icon: 'i-lucide-calendar-check',
    },
    {
        to: '/checkout/my-orders',
        title: 'My Orders',
        description: 'View your registration orders and tickets.',
        icon: 'i-lucide-receipt',
    },
    {
        to: '/contact-us',
        title: 'Get Help',
        description: 'Need assistance? Reach out to the congress team.',
        icon: 'i-lucide-message-circle-question-mark',

    },
    {
        to: '/host/venue',
        title: 'Venue & Host City',
        description: 'Discover the congress venue and explore what Taiwan has to offer.',
        icon: 'i-lucide-map-pin',
    },
    {
        to: '/accommodation',
        title: 'Book a Hotel',
        description: 'Browse recommended hotels and book at the congress group rate.',
        icon: 'i-lucide-bed-double',
    },
]
const ready = ref(false);
const { copy, copied } = useClipboard();

const auth = await useAuthStore();

const isLoggedIn = computed(() =>
  auth.isAuthenticated !== false
)


const personFields = [
    'id',
    'first_name',
    'last_name',
    'email',
    { avatar: ['id', 'filename_download', 'type'] },
    'has_subscription',
    'country',
    'membership_number',
    'title',
    {
        'voucher_codes': [
            'code',
            {
                'voucher': [
                    'name',
                    'description'
                ]
            }
        ]
    },
    {
        person : [
            'id',
            'country',
            'first_name',
            'last_name',
            'title',
            'qualifications',
            'bio',
            'affiliations',
            { image: ['id', 'filename_download', 'type'] },
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
            /*{
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
            }*/
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

type UserProfile = DirectusUser & {
    has_subscription?: boolean | null;
    membership_number?: string | null;
    person?: any;
};
const profile = ref<UserProfile>();

const {
	public: { directusUrl },
} = useRuntimeConfig();

const countryCode = computed(() => {
    const raw = profile.value?.country as any;
    if (!raw) return '';
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return (parsed?.key ?? '').toUpperCase();
});

const countryFlag = computed(() => {
    if (!countryCode.value) return '';
    return [...countryCode.value].map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
});

const voucherCodes = computed(() => (profile.value as any)?.voucher_codes ?? []);

function voucherName(v: any) {
    return typeof v.voucher === 'object' && v.voucher ? (v.voucher.name ?? '') : '';
}

function voucherDescription(v: any) {
    return typeof v.voucher === 'object' && v.voucher ? (v.voucher.description ?? '') : '';
}

watch(
  ready,
  async (ready) => {
    if (!ready || !isLoggedIn) return
    const { data } = await useAsyncData <DirectusUser>('profile-' + auth.isAuthenticated.id , async() => {
        return await $directus.request<DirectusUser>(readMe(
            {   
                fields: personFields,
                deep: {
                        voucher_codes: {
                            _filter: {
                                status: { '_eq' : 'active'},
                                voucher: {
                                    congress: {
                                        site: {
                                            '_eq' : config.public.siteId
                                        }
                                    }
                                }
                            }
                            
                        },
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
            topic: event,
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

useSeoMeta({ title: 'My Profile', ogTitle: 'My Profile', robots: 'noindex' });

type EventEntry = {
  id: string
  startTime: string | number | null
  endTime: string | null
  topic: CongressEvent | null | undefined
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
                event: row.getValue('topic') as CongressEvent
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

type Schema = z.infer<typeof schema>

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


const avatarInput = ref<HTMLInputElement | null>(null);
const avatarUploading = ref(false);

const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png'];
const AVATAR_MAX_BYTES = 1 * 1024 * 1024; // 1 MB

const onAvatarChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
        toast.add({ title: 'Invalid file type', description: 'Please upload a JPEG or PNG image.', color: 'error' });
        return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
        toast.add({ title: 'File too large', description: 'Avatar must be under 1 MB.', color: 'error' });
        return;
    }

    avatarUploading.value = true;
    try {
        const fd = new FormData();
        fd.append('folder', config.public.userAvatarFolder as string);
        fd.append('file', file, file.name);
        const uploaded = await $directus.request(uploadFiles(fd)) as { id?: string };
        if (!uploaded?.id) throw new Error('Upload failed');

        await $directus.request(updateMe({ avatar: uploaded.id }));
        if (profile.value) profile.value.avatar = uploaded.id;
        toast.add({ title: 'Avatar updated', color: 'accent' });
    } catch (e) {
        toast.add({ title: 'Upload failed', color: 'error' });
        console.error(e);
    } finally {
        avatarUploading.value = false;
    }
};

onMounted(async () => {
  // if your store has a fetch method, call it here
  ready.value = true
})

</script>
<template>
    
    <UError
      v-if="!isLoggedIn"
      redirect="/login"
      :clear="{
        color: 'neutral',
        size: 'xl',
        trailingIcon: 'i-lucide-arrow-right',
        class: 'rounded-full',
        label: 'Log In',
      }"
      :error="{
        statusCode: 404,
        statusMessage: 'Sign In Required',
        message: 'You need to sign in to access this page.'
      }"
    />
	<div  v-else ref="wrapperRef">
		<Container class="py-12">
            <Headline headline="My Profile" class="text-accent text-center"/>

            <!-- User Account Card -->
            <div v-if="profile" class="max-w-2xl mx-auto mb-10">
                <UCard class="ring-1 ring-accent/20 relative">
                    <UDropdownMenu
                        :items="profileMenuItems"
                        :content="{ align: 'end' }"
                        :ui="{ content: 'w-56' }"
                        class="absolute top-4 right-4"
                    >
                        <UButton
                            icon="i-lucide-ellipsis-vertical"
                            color="neutral"
                            variant="ghost"
                            aria-label="Profile actions"
                        />
                    </UDropdownMenu>
                    <div class="flex items-center gap-6">
                        <!-- Avatar -->
                        <div
                            class="relative shrink-0 w-24 h-24 cursor-pointer"
                            @click="avatarInput?.click()"
                        >
                            <DirectusImage
                                v-if="profile.avatar"
                                :uuid="profile.avatar"
                                alt="Profile avatar"
                                class="w-24 h-24 rounded-full object-cover ring-2 ring-accent/30"
                            />
                            <div v-else class="w-24 h-24 rounded-full ring-2 ring-accent/30 bg-accent/10 flex items-center justify-center">
                                <UIcon name="i-lucide-circle-user-round" size="72" class="text-accent/60" />
                            </div>
                            <div class="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                                <UIcon v-if="!avatarUploading" name="i-lucide-pencil" size="14" class="text-white" />
                                <UIcon v-else name="i-lucide-loader-circle" size="14" class="text-white animate-spin" />
                            </div>
                            <input
                                ref="avatarInput"
                                type="file"
                                accept="image/jpeg,image/png"
                                class="hidden"
                                @change="onAvatarChange"
                            />
                        </div>

                        <!-- Profile fields -->
                        <div class="flex-1 min-w-0 space-y-1">
                            <p v-if="profile.title" class="text-sm text-muted">{{ profile.title }}</p>
                            <h2 class="font-heading text-2xl leading-tight truncate">
                                {{ profile.first_name }} {{ profile.last_name }}
                            </h2>
                            <div class="mt-2 space-y-1.5 text-sm">
                                <div class="flex items-center gap-2">
                                    <UIcon name="i-lucide-mail" class="text-muted shrink-0" />
                                    <span class="truncate">{{ profile.email }}</span>
                                </div>
                                <div v-if="countryCode" class="flex items-center gap-2">
                                    <UIcon name="i-lucide-map-pin" class="text-muted shrink-0" />
                                    <span>{{ countryFlag }}</span>
                                    <CountryName :country-codes="[countryCode]" />
                                </div>
                                <div v-if="profile.membership_number" class="flex items-center gap-2">
                                    <UIcon name="i-lucide-id-card" class="text-muted shrink-0" />
                                    <span>Membership Number: {{ profile.membership_number }}</span>
                                </div>
                                <div v-else>
                                    <UAlert icon="i-lucide-triangle-alert" title="No Active APOA Membership" color="accent" class="w-fit my-2 ring text-accent-100" />
                                    <div class="flex items-center gap-2 space-y-1.5 ">
                                        <span>Not a member yet?</span>
                                        <UButton to="https://apoaonline.com/auth/apoa/signup.php" color="secondary"  variant="outline" label="Join the APOA" />
                                    </div>
                                    <div class="flex items-center gap-2 py-1">
                                        <span>Membership Missing?</span>
                                        <UButton to="/contact-us" color="secondary" variant="outline" label="Get Help" />
                                    </div>
                                </div>
                                
                                <div class="pt-1">
                                    <UBadge
                                        v-if="profile.has_subscription"
                                        color="accent"
                                        variant="subtle"
                                        icon="i-lucide-circle-check"
                                        label="Active Subscription"
                                    />
                                    <UBadge
                                        v-else
                                        color="neutral"
                                        variant="subtle"
                                        icon="i-lucide-circle-x"
                                        label="No Subscription"
                                    />
                                </div>

                                
                            </div>
                        </div>
                    </div>
                    <div v-if="voucherCodes.length" class="pt-2 space-y-3">
                        <h4>Vouchers</h4>
                        <div v-for="v in voucherCodes" :key="v.code" class="flex flex-col gap-1">
                            <span v-if="voucherName(v)" class=" text-md truncate">{{ voucherName(v) }}</span>
                            <div class="flex items-center gap-2 w-fit rounded-md border border-accent/40 bg-accent/10 pl-3 pr-1 py-1.5">
                                <UIcon name="i-lucide-ticket" class="text-accent shrink-0" />
                                <span class="font-mono font-semibold text-lg tracking-wide">{{ v.code }}</span>
                                <UButton
                                    :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                                    size="xs"
                                    color="neutral"
                                    variant="ghost"
                                    @click="copy(v.code)"
                                />
                            </div>
                            <p v-if="voucherDescription(v)" class="text-xs text-muted">{{ voucherDescription(v) }}</p>
                        </div>
                    </div>
                </UCard>
            </div>
            
            <!-- What's Next suggestions -->
            <div class="max-w-4xl mx-auto my-8">
                <Headline headline="What would you like to do?" class="text-center mb-6" />
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <UPageCard
                        v-for="card in quickLinkCards"
                        :key="card.to"
                        :to="card.to"
                        :title="card.title"
                        :description="card.description"
                        :icon="card.icon"
                        highlight-color="accent"
                        :highlight="card.highlight"
                        spotlight
                        spotlight-color="warning"
                        class="hover:ring-accent/50 transition-all"
                        :ui="{ leadingIcon: 'text-accent', title: 'text-xl' }"
                    />
                </div>
            </div>

            <Headline v-if="profile?.person" headline="Congress Profile" class="text-accent text-center mt-8"/>
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
                    <Tagline tagline="Committees" ></Tagline>
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
                    <Tagline tagline="Events"></Tagline>
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
            <!---<div v-else class="text-center text-xl flex-column">
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
            -->
		</Container>
	</div>
	
</template>
