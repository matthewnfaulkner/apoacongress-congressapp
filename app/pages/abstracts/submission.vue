<script setup lang="ts">
import { withLeadingSlash, withoutTrailingSlash } from 'ufo';
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { createItem, readItems, deleteItem, updateItem } from '@directus/sdk';
import type { AbstractSubmission, AbstractSubmissionValue, CongressAbstracts } from '~~/shared/types/schema';
import type { AccordionItem } from '@nuxt/ui'
import { UBadge, UDropdownMenu, UButton } from '#components';
import type { TableColumn, TableRow } from '@nuxt/ui';
const config = useRuntimeConfig();

const route = useRoute();
const pageUrl = useRequestURL();
const { $directus, $isAuthenticatedWithPolicy } = useNuxtApp();

const { locale, defaultLocale } = useI18n();
const path = withoutTrailingSlash(withLeadingSlash(route.path));
const permalink = locale.value === defaultLocale ?  path : '/';
const loading = ref(true)
const isAuthenticated = await $isAuthenticatedWithPolicy('Abstracts - Submit');

const isLoggedIn = computed(() =>
  isAuthenticated ? true: false
)

const turnstileToken = ref();

const congressAbstract = ref<CongressAbstracts | null>(null);
const submissions = ref<AbstractSubmission[] | null>(null)
const storeReady = ref(false)
const categories = ref([]);
const guideLines = ref<AccordionItem>([]);


const { data } = await useAsyncData <CongressAbstracts[]>('abstract_submit', async() => {
      return await $directus.request<CongressAbstracts[]>(readItems(
        'abstracts',
        {   
            limit: 1,
            fields: ['id', 'categories', 'submission_deadline', 'description', 'submission_limit'],
            filter: {
            congress: {
                site:{
                  _eq: config.public.siteId
                }
            },
          },
        }
    ))})

if(!data.value) {
    throw new Error('No Congress Abstract');
}

data.value = data.value as CongressAbstracts[];

congressAbstract.value = data.value[0] || null;
const submission_limit = congressAbstract.value?.submission_limit || 100;
categories.value = congressAbstract?.value?.categories; 
guideLines.value = [
    {
        label: 'Submission Guidelines',
        content: congressAbstract?.value?.description || '',

    }
]

const submissionsClosed = false;


// Watch for storeReady
watch(
  storeReady,
  async (ready) => {
    if (!ready) return

    
    // Fetch submissions once the store is ready
    const { data } = await useAsyncData('submissions', async () => {
      return await $directus.request<AbstractSubmission[]>(readItems(
        'abstract_submissions',
        {
          limit: -1,
          fields: [
                    'id',
                    'status',
                    'date_created',
                    'user_created',
                    {
                        submission_values: [
                            'id',
                            'field',
                            'value'
                        ]
                    },
          ],
          filter: {
            congress_abstract: {
                _eq: congressAbstract?.value?.id
            },
            submitter: {
              _eq: "$CURRENT_USER"
            }
          },
        }
      ))
    })

    if(data.value && data.value.length > 0) {
        submissions.value = data.value as AbstractSubmission[];
    }
    loading.value = false
  }// run immediately if storeReady is already true
)


type Submission = {
  id: string
  submitted: string
  status: 'submitted' | 'invited' | 'accepted' | 'reviewed' | 'waitingList' | 'rejected'
  title: string,
  abstract: string,
  category: string,
  authors: string[] | { name: string; title: string; institution: string }[],
}

const submissionsTable = computed<Submission[]>(() => {
  if (!submissions.value) return [];
  return submissions.value.map(submission => {
    const valuesObj = (submission.submission_values as AbstractSubmissionValue[])?.reduce((acc, curr) => {
      if (curr.field) acc[curr.field] = curr.value;
      return acc;
    }, {} as Record<string, any>) ?? {};
    return {
      id: submission.id,
      status: submission.status,
      submitted: submission.date_created,
      ...valuesObj
    } as Submission;
  });
});

const columns: TableColumn<Submission>[] = [
{
    accessorKey: 'title',
    header: 'Title'
  },
  {
    accessorKey: 'submitted',
    header: 'Date Submitted',
    cell: ({ row }: { row: any }) => row.getValue('submitted')
      ? new Date(row.getValue('submitted')).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const color = {
        submitted: 'neutral' as const,
        rejected: 'error' as const,
        waitingList: 'warning' as const,
        invited: 'info' as const,
        accepted: 'success' as const,
        reviewed: 'secondary' as const,

      }[row.getValue('status') as string]

      return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
        row.getValue('status')
      )
    }
  },
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
  }

]

function getRowItems(row: TableRow<Submission>) {
  if (submissionsClosed) return [];
  return [
    {
      label: 'Edit',
      icon: 'i-lucide-settings',
      onSelect() {
        openSubmissionForm.value = true;
        state.id = row.original.id;
        state.abstract = row.original.abstract;
        state.authors = row.original.authors ? JSON.parse(row.original.authors) : {};
        state.category = row.original.category;
        state.title = row.original.title;
      }
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash',
      onSelect() {
        openConfirmation.value = true
        toBeDeleted.value = row.original
      }
    },
  ]
}

const schema = z.object({
  id: z.any().nullable(),
  abstract: z.string('Abstract is required').max(250, 'Max 250 Characters'),
  title: z.string('Title is required').max(150, "Max 150 Characters"),
  category: z.string('Category is required'),
  authors: z.array(
    z.object({
        title: z.string().nonempty("Title is required"),
        name: z.string().nonempty("Author name is required"),
        institution: z.string().nonempty("Institution is required")
    })
  ).min(1, "At least one author is required").refine(authors => 
    authors.every(a => a.title.trim() !== "" && a.name.trim() !== "" && a.institution.trim() !== ""),
    { message: "All authors must have a title, name, and institution" }
  ),
  consent: z.boolean().refine(val => val === true, {
    message: "You must give your consent",
  })
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  id: undefined,
  title: undefined,
  abstract: undefined,
  authors: [{
    title: '',
    name: '',
    institution: ''
  }],
  category: undefined,
  consent: false
})

function resetState() {
  state.id = undefined,
  state.title = undefined;
  state.abstract = undefined;
  state.authors = [{title: '', name: '', institution: '' }];
  state.category = undefined;
  state.consent = false;
}


const error = ref<string | null>(null);

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	error.value = null;
	if (!turnstileToken.value) {
		error.value = 'Please complete the CAPTCHA before submitting.';
		return;
	}

  if(!state.id && (submissions?.value?.length || 0) >= submission_limit) {
    error.value = 'You have reached your submission limit.';
		return;
  }
  if(submissionsClosed) {
    error.value = 'The deadline for abstract submission has passed.';
		return;
  }
	try {
        const formData = submission.data as Schema;

        if(congressAbstract.value == null || congressAbstract.value == undefined) {
            throw new Error('Congress Abstracts Missing');
        }
        // When editing, look up existing submission_values IDs so Directus updates
        // the existing records rather than trying to create new ones.
        const existingSvIds: Record<string, string> = {};
        if (state.id) {
            const existingSub = submissions.value?.find(s => s.id === state.id);
            for (const sv of (existingSub?.submission_values as AbstractSubmissionValue[]) ?? []) {
                if (sv.field && sv.id) existingSvIds[sv.field] = sv.id;
            }
        }

        const sv = (field: string, value: string) => ({
            ...(existingSvIds[field] ? { id: existingSvIds[field] } : {}),
            field,
            value,
        });

        const payload = {
            congress_abstract: congressAbstract.value?.id || null,
            submitter: isAuthenticated.id,
            submission_values: [
                sv('category', formData.category),
                sv('title', formData.title),
                sv('abstract', formData.abstract),
                sv('authors', JSON.stringify(formData.authors)),
            ]
        }

        if(!state.id) {
            const response = await $directus.request<AbstractSubmission>(createItem(
                'abstract_submissions', payload
            ))

            if (!submissions.value) submissions.value = [];
            submissions.value.push({
                id: response.id,
                status: response.status,
                date_created: response.date_created,
                submitter: (isAuthenticated as any).id,
                submission_values: [
                    { id: '', field: 'category', value: formData.category },
                    { id: '', field: 'title', value: formData.title },
                    { id: '', field: 'abstract', value: formData.abstract },
                    { id: '', field: 'authors', value: JSON.stringify(formData.authors) },
                ]
            });
        } else{
            const response = await $directus.request<AbstractSubmission>(updateItem(
                'abstract_submissions', state.id, payload
            ))

            const sub = submissions.value?.find(s => s.id === state.id);
            if (sub) {
                sub.status = response.status;
                const updates: Record<string, string> = {
                    category: formData.category,
                    title: formData.title,
                    abstract: formData.abstract,
                    authors: JSON.stringify(formData.authors),
                };
                sub.submission_values = (sub.submission_values as AbstractSubmissionValue[])?.map(sv =>
                    sv.field && updates[sv.field] !== undefined ? { ...sv, value: updates[sv.field] } : sv
                );
            }
        }
        resetState();
        openSubmissionForm.value = false;
	} catch (e) {
		error.value = 'Failed to submit the form. Please try again later.';
        console.log(e);
	} finally{
        storeReady.value = true;
    }
};


const handleDelete = async() => {
    try {
        if(!toBeDeleted.value) return;
        await $directus.request(deleteItem('abstract_submissions', toBeDeleted.value.id));
        submissions.value = submissions.value?.filter(s => s.id !== toBeDeleted.value?.id) ?? null;
        openConfirmation.value = false;
        toBeDeleted.value = undefined;
    } catch (deletionError) {
        console.log(deletionError)
    }
}

const openSubmissionForm = ref(false)
const openConfirmation = ref(false);
const toBeDeleted = ref<Submission>();

onMounted(async () => {
  // if your store has a fetch method, call it here
  if(isLoggedIn.value) {
    storeReady.value = true
  }

})

useSeoMeta({ title: 'Abstract Submission', ogTitle: 'Abstract Submission', robots: 'noindex', ogUrl: pageUrl.toString(), });
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
	<div  v-else class="relative my-5">
        <ClientOnly>
            <UModal v-model:open="openConfirmation" title="Confirm Delete?">
                <template #body>
                        <p class="text-muted">Are you sure you want to delete this submission? : </p> 
                        <p class="text-2xl text-center my-3"> {{ toBeDeleted?.title }}</p>
                        <div  class="flex gap-4 justify-between mx-20" >
                            <UButton label="cancel" variant="outline" color="secondary" />
                            <UButton label="delete" color="accent"  @click="handleDelete"/>
                        </div>
                </template>
            </UModal>
            <UModal  
                scrollable 
                v-model:open="openSubmissionForm"
                :ui="{
                    content: 'max-w-none',
                    body: 'p-5 m-auto'
                }"
                :close="{
                    color: 'accent',
                    variant: 'solid',
                    class: 'rounded-full'
                    }">
                <template #body>
                    <div >
                        <Headline :headline="state.id ? 'Updating Submission' : 'Abstract Submission Form'"/>
                        <UAccordion 
                            :items="guideLines" 
                            class="max-w-200"
                            :ui="{
                                label: 'text-2xl text-accent',
                                trailingIcon: 'text-2xl text-accent'
                            }">
        
                            <template #content="{item}">
                                <div v-html="item.content">

                                </div>
                            </template>
                        </UAccordion>
                        <UForm 
                            @submit="handleSubmit"
                            :schema="schema"
                            :state="state">
                            <UInput type="hidden" v-model="state.id"/>
                            <UFormField required label="Category" name="category" size="xl"  class="pb-5">
                                <USelect :items="categories" v-model="state.category" class="w-75 md:w-100 lg:w-100" color="secondary" variant="subtle"/>
                            </UFormField>
                            <UFormField required label="Title" name="title"  size="xl"  class="pb-5">
                                <UInput v-model="state.title" class="w-75 md:w-100 lg:w-200" color="secondary" variant="subtle"  />
                            </UFormField>
                            <UFormField required label="Abstract" name="abstracr"  size="xl"  class="pb-5">
                                <UTextarea v-model="state.abstract" class="w-full lg:w-200" :rows=15 color="secondary" variant="subtle"/>
                            </UFormField>
                            <UFormField 
                                required 
                                label="Authors" 
                                name="authors" 
                                size="xl" 
                                class="text-center pb-5" 
                                :ui="{
                                  hint: 'text-sm wrap max-w-150 text-left'
                                }"
                                hint="One by one enter the details of each author. Enter the presenter's details as the first entry. Take care when entering the full name as it will be used exactly as provided." 
                                >
                                <div v-for="(author, index) in state.authors" :key="index" class="mb-2 lg:flex lg:gap-2 lg:items-center p-2 rounded-lg" :class="index == 0 ? 'bg-accent/40 ring-2 ring-accent mt-5' : ''">
                                    <p v-if="index === 0 " class="text-accent-600 mb-3"><small>Presenter / Author 1</small></p>
                                    <p v-else class=""><small>{{ `Author ${index+1}` }}</small></p>
                                    <div class="flex gap-2 mb-2 lg:mb-0 lg:contents">
                                        <UInput v-model="author.title" placeholder="title" class="w-24" color="secondary" variant="subtle" :ui="{ base: 'peer' }">
                                          <label 
                                            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-lg peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
                                            >
                                            <span class="inline-flex bg-primary px-1">Title</span>
                                          </label>
                                        </UInput>
                                        <UInput v-model="author.name" placeholder="Full Name"  class="flex-1" color="secondary" variant="subtle" :ui="{ base: 'peer' }">
                                           <label 
                                            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-lg peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
                                            >
                                            <span class="inline-flex bg-primary px-1 peer-focus:text-sm">Full Name</span>
                                          </label>
                                        </UInput>
                                    </div>
                                    <div class="flex gap-2 items-center lg:contents">
                                        <UInput v-model="author.institution" placeholder="Institution" class="flex-1" color="secondary" variant="subtle" :ui="{ base: 'peer' }"> 
                                          <label 
                                            class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-lg peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal"
                                            >
                                            <span class="inline-flex bg-primary px-1">Institution</span>
                                          </label>
                                        </UInput>
                                        <UButton
                                            v-if="index > 0"
                                            icon="i-lucide-trash"
                                            variant="outline"
                                            color="secondary"
                                            type="button"
                                            size="xl"
                                            @click="state.authors!.splice(index, 1)">
                                        </UButton>
                                    </div>
                                </div>
                                <UButton 
                                    type="button" 
                                    variant="solid" 
                                    color="accent" 
                                    icon="i-lucide-plus"
                                    size="xl"
                                    class="m-auto"
                                    @click="state.authors!.push({title: '', name: '', institution: '' })"/>
                            </UFormField>
                            <UFormField  class="pb-5" name="consent">
                                <UCheckbox v-model="state.consent" size="lg" variant="card" label="I hereby agree to the terms and conditions of abstract submission." color="accent"/>
                            </UFormField>
                            <div>
                            <UFormField  class="py-5 text-center" name="captcha">
                                <NuxtTurnstile v-model="turnstileToken" />
                            </UFormField>
                            </div>
                            <UAlert v-if="error" color="error" variant="subtle" :description="error" class="mb-3" />
                            <div class="w-full text-center">
                              <UButton
                                  :label="state.id ? 'Update' : 'Submit'"
                                  color="accent"
                                  variant="solid"
                                  size="xl"
                                  class="m-auto"
                                  type="submit">
                              </UButton>
                            </div>
                        </UForm>
                    </div>
                </template>
            </UModal>
        </ClientOnly>
        <div class="flex flex-col items-center justify-center gap-4 p-4">
            <Headline headline="Abstract Submissions"/> 
                    <p v-if="submissionsClosed" class="text-muted">
                        Abstract submissions are closed.
                    </p>
                    <template v-else>
                        <UButton
                            v-if="(submissions?.length || 0) < submission_limit"
                            label="Submit New Abstract"
                            color="accent"
                            @click="() => {openSubmissionForm = true; resetState()}"
                        />
                        <p v-else>
                            Cannot Submit Further Abstracts - Limit Reached
                        </p>
                    </template>
                    <UProgress  v-if="loading" color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50"/>
                    <!-- Table with data -->
                    <UTable 
                        v-else
                        :data="submissionsTable" 
                        :columns="columns" 
                        class="lg:w-200"
                        />

            
        </div>        
	</div>
</template>
