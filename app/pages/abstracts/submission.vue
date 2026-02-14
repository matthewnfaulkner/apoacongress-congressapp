<script setup lang="ts">
import { withLeadingSlash, withoutTrailingSlash } from 'ufo';
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { createItem, readItems, deleteItem, updateItem } from '@directus/sdk';
import type { AbstractSubmission, CongressAbstracts } from '~~/shared/types/schema';
import type { AccordionItem } from '@nuxt/ui'

const config = useRuntimeConfig();

const route = useRoute();
const pageUrl = useRequestURL();
const { $directus, $isAuthenticated } = useNuxtApp();

const { locale, locales, defaultLocale } = useI18n();
const path = withoutTrailingSlash(withLeadingSlash(route.path));
const permalink = locale.value === defaultLocale ?  path : '/';

const auth = await useAuthStore();

const isLoggedIn = computed(() =>
  auth.isAuthenticated !== false
)


const congressAbstract = ref<CongressAbstracts | null>(null);
const submissions = ref<AbstractSubmission[] | string[] | null>(null)
const storeReady = ref(false)
const categories = ref([]);
const guideLines = ref<AccordionItem>([]);

const { data } = await useAsyncData <CongressAbstracts[]>('abstract_submit', async() => {
      return await $directus.request<CongressAbstracts[]>(readItems(
        'abstracts',
        {   
            limit: 1,
            fields: ['id', 'categories', 'submission_deadline', 'description'],
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

congressAbstract.value = data.value[0];
categories.value = congressAbstract?.value?.categories;
guideLines.value = [
    {
        label: 'Submission Guidelines',
        content: congressAbstract?.value?.description || '',

    }
]
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
        data.value = data.value as AbstractSubmission[];
        submissions.value = data.value;
        if(submissions.value){
            hasSubmissions.value = true;
            submissionsTable.value = submissions?.value?.map(submission => {
                // Convert submission_values array to an object
                const valuesObj = submission.submission_values?.reduce((acc, curr) => {
                    acc[curr.field] = curr.value;
                    return acc;
                }, {} as Record<string, any>);

                // Merge with status and submitted
                return {
                    id: submission.id,
                    status: submission.status,
                    submitted: submission.date_created,
                    ...valuesObj
            };
        });
    }
}
  }// run immediately if storeReady is already true
)


type Submission = {
  id: string
  submitted: string
  status: 'submitted' | 'invited' | 'accepted' | 'reviewed' | 'waitingList' | 'rejected'
  title: string,
  abstract: string,
  category: string,
  authors: string[],
}


const hasSubmissions = ref(false);
const submissionsCount = ref(submissions.value?.length || 0);
const submissionsTable = ref<Submission[]>([]);




const columns: TableColumn<Submission>[] = [
{
    accessorKey: 'title',
    header: 'Title'
  },
  {
    accessorKey: 'submitted',
    header: 'Date Submitted',
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

function getRowItems(row: Row<Submission>) {
  return [
    {
      label: 'Edit',
      icon: 'i-lucide-settings',
      onSelect() {
        openSubmissionForm.value = true;
        state.id = row.original.id;
        state.abstract = row.original.abstract;
        state.authors = JSON.parse(row.original.authors);
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
  title: z.string('Title is required').max(75, "Max 75 Characters"),
  category: z.string('Category is required'),
  authors: z.array(
    z.object({
        name: z.string().nonempty("Author name is required"),
        institution: z.string().nonempty("Institution is required")
    })
  ).min(1, "At least one author is required").refine(authors => 
    authors.every(a => a.name.trim() !== "" && a.institution.trim() !== ""),
    { message: "All authors must have a name and institution" }
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
    name: undefined,
    institution: undefined
  }],
  category: undefined,
  consent: false
})

function resetState() {
  state.id = undefined,
  state.title = undefined;
  state.abstract = undefined;
  state.authors = [{ name: undefined, institution: undefined }];``
  state.category = undefined;
  state.consent = false;
}

const isSubmitted = ref(false);
const error = ref<string | null>(null);

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	error.value = null;
	try {
        const formData = submission.data as Schema;

        if(congressAbstract.value == null || congressAbstract.value == undefined) {
            throw new Error('Congress Abstracts Missing');
        }
        const payload = {
            congress_abstract: congressAbstract.value?.id || null,
            submitter: auth.isAuthenticated.id,
            submission_values: [
                {
                    value: formData.category,
                    field: 'category'
                },
                {
                    value: formData.title,
                    field: 'title'
                },
                {
                    value: formData.abstract,
                    field: 'abstract'
                },
                {
                    value: JSON.stringify(formData.authors),
                    field: 'authors'
                }
            ]
        }
        
        if(!state.id) {
            const response = await $directus.request<AbstractSubmission>(createItem(
                'abstract_submissions', payload
            )) 

            submissionsTable.value.push({
                id: response.id,
                title: state.title || '',
                submitted: response.date_created || '',
                status: response.status || 'submitted',
            }
        );
        } else{
            const response = await $directus.request<AbstractSubmission>(updateItem(
                'abstract_submissions', state.id ,payload
            )) 
            
            const updatedRow = submissionsTable.value.find(row => row.id == state.id)
            
            if(updatedRow) {
                updatedRow.abstract = state.abstract || '';
                updatedRow.authors = state.authors || [];
                updatedRow.status = response.status;
                updatedRow.title = state.title || '';
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
        $directus.request(deleteItem('abstract_submissions', toBeDeleted.value.id));
        submissionsTable.value = submissionsTable.value.filter(submission => submission.id != toBeDeleted?.value?.id);
        openConfirmation.value = false;
        toBeDeleted.value = '';
    } catch (deletionError) {
        console.log(error)
    }
}

const openSubmissionForm = ref(false)
const openConfirmation = ref(false);
const toBeDeleted = ref<Submission>();
const deletionError = ref();


onMounted(async () => {
  // if your store has a fetch method, call it here
  if(isLoggedIn.value) {
    storeReady.value = true
  }
  
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
                                <UTextarea v-model="state.abstract" class="w-75 md:w-100 lg:w-200" :rows=15 color="secondary" variant="subtle"/>
                            </UFormField>
                            <UFormField required label="Authors" name="authors" size="xl" class="text-center pb-5" >
                                <div v-for="(author, index) in state.authors" :key="index" class="flex lg:gap-2 mb-2">
                                    <UInput v-model="author.name" placeholder="Name" class="lg:w-95" color="secondary" variant="subtle"/>
                                    <UInput v-model="author.institution" placeholder="Institution" class="lg:w-95" color="secondary" variant="subtle"/>
                                    <UButton 
                                        icon="i-lucide-trash" 
                                        variant="outline" 
                                        color="secondary" 
                                        type="button" 
                                        size="xl"
                                        @click="state.authors.splice(index, 1)">
                                    </UButton>
                                </div>
                                <UButton 
                                    type="button" 
                                    variant="solid" 
                                    color="accent" 
                                    icon="i-lucide-plus"
                                    size="xl"
                                    class="m-auto"
                                    @click="state.authors.push({ name: '', institution: '' })"/>
                            </UFormField>
                            <UFormField  class="pb-5" name="consent">
                                <UCheckbox v-model="state.consent" label="I hereby agree to the terms and conditions of abstract submission." color="accent"/>
                            </UFormField>
                            <div>
                                
                            </div>
                            <UButton 
                                :label="state.id ? 'Update' : 'Submit'"
                                color="accent"
                                variant="solid"
                                size="xl"
                                type="submit">
                            </UButton>
                        </UForm>
                    </div>
                </template>
            </UModal>
        </ClientOnly>
        <div class="flex flex-col items-center justify-center gap-4 p-4">
            <Headline headline="Abstract Submissions"/> 
                    <UProgress  v-if="!storeReady" color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50"/>
                    <!-- Table with data -->
                    <UTable 
                        v-else
                        :data="submissionsTable" 
                        :columns="columns" 
                        class="lg:w-200"
                        />

            <UButton 
                v-if="submissionsCount < 5" 
                label="Submit New Abstract"
                color="accent"
                @click="() => {openSubmissionForm = true; resetState()}"
            />
            <p v-else>
                Cannot Submit Further Abstracts - Limit Reached
            </p>
        </div>        
	</div>
</template>
