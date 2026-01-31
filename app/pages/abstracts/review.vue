<script setup lang="ts">
import { withLeadingSlash, withoutTrailingSlash } from 'ufo';
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { createItem, readItems, deleteItem, updateItem } from '@directus/sdk';
import type { AbstractSubmission, CongressAbstracts } from '~~/shared/types/schema';
import type { AccordionItem } from '@nuxt/ui'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import { dateStringToHumanString } from '@/utils/time-utils'
const toast = useToast();
const config = useRuntimeConfig();

const route = useRoute();
const pageUrl = useRequestURL();
const { $directus, $isAuthenticatedWithPolicy, $hasPolicy } = useNuxtApp();

const { locale, locales, defaultLocale } = useI18n();
const path = withoutTrailingSlash(withLeadingSlash(route.path));
const permalink = locale.value === defaultLocale ?  path : '/';

const isAuthenticated = await $isAuthenticatedWithPolicy('Abstracts - Reviewer');

const isLoggedIn = computed(() =>
  isAuthenticated !== false
)


const table = useTemplateRef('table')
const submissions = ref<AbstractSubmission[] | null>(null)
const storeReady = ref(false)
const categories = ref([]);

onMounted(async () => {
  // if your store has a fetch method, call it here
  storeReady.value = true
})


const congressAbstract = ref<CongressAbstracts | null>(null);
const reviewTable = ref<AbstractReviewable[]>([]);
const reviewerId = ref(0);

watch(
  storeReady,
  async (ready) => {
    if (!ready) return
    const { data } = await useAsyncData <CongressAbstracts[]>('abstracts', async() => {
        return await $directus.request<CongressAbstracts[]>(readItems(
          'abstracts',
          {   
              limit: 1,
              fields: [
                'id', 
                'categories', 
                'submission_deadline', 
                {
                  reviewers : [
                    'id',
                    {
                      users: [
                        'id'
                      ]
                    }
                  ]
                }
              ],
              filter: {
                congress: {
                    _eq: config.public.congressId
                },
            },
          }
      )
    )})

    if(!data.value) {
        throw new Error('No Congress Abstract');
    }
    data.value = data.value as CongressAbstracts[];

    congressAbstract.value = data.value[0];
    reviewerId.value = congressAbstract.value?.reviewers?.[0].id
    categories.value = congressAbstract?.value?.categories;
  })



watch(
  storeReady,
  async (ready) => {
    if (!ready) return
   
    // Fetch submissions once the store is ready
    const { data } = await useAsyncData('submissions', async () => {
      return await $directus.request<AbstractSubmission[]>(readItems(
        'abstract_submissions',
        {
          fields: [
            'id',
            'status',
            'date_created',
            'reviewer',
            {
              submission_values: [
                'id',
                'field',
                'value'
              ]
            }
          ],
          filter: {
            congress_abstract: {
                _eq: congressAbstract?.value?.id
            },
            user_created:{
              _neq: "$CURRENT_USER"
            }
          },
          meta: 'total_count'
        }
      ))
    })
    submissions.value = data.value || null
    if(submissions.value) {
        hasSubmissions.value = true;
        if(submissions.value){
            hasSubmissions.value = true;
            reviewTable.value = submissions?.value?.map(submission => {
                // Convert submission_values array to an object
                const valuesObj = submission.submission_values?.reduce((acc, curr) => {
                    acc[curr.field] = curr.value;
                    return acc;
                }, {} as Record<string, any>);

                // Merge with status and submitted
                return {
                    id: submission.id,
                    status: submission.status,
                    reviewer: submission.reviewer,
                    submitted: submission.date_created,
                    ...valuesObj
            };
        });
    }
        

    }
  }// run immediately if storeReady is already true
)

const schema = z.object({
  id: z.any().nullable(),
  abstract: z.string('Abstract is required').max(250, 'Max 250 Characters'),
  title: z.string('Title is required').max(75, "Max 75 Characters"),
  category: z.string('Category is required'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<AbstractReviewable>>({
  id: undefined,
  title: undefined,
  abstract: undefined,
  category: undefined,
  status: undefined
})

function resetState() {
  state.id = undefined,
  state.title = undefined;
  state.abstract = undefined;
  state.category = undefined;
  state.status = undefined;
}

type AbstractReviewable = {
  id: string
  title: string
  category: string
  date: number
  abstract: string
  reviewer: string
  status: string
}

const columns: TableColumn<AbstractReviewable>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
    meta:{
      class:{
        td: 'max-w-5'
      }
    },
    cell: ({ row }) => {
      const color = {
        approved: 'success' as const,
        rejected: 'error' as const,
        pending: 'neutral' as const
      }[row.getValue('status') as string]

      return h(UButton, { class: 'capitalize', variant: 'subtle', color, onClick: () => {openSubmissionForm.value = true;
        state.id = row.original.id;
        state.abstract = row.original.abstract;
        state.category = row.original.category;
        state.title = row.original.title;} }, () =>
        row.getValue('status')
      )
    }
  },
  {
    accessorKey: 'submitted',
    header: 'Date',
    meta:{
      class:{
        td: 'max-w-5'
      }
    },
    cell: ({ row }) => {
      return new Date(row.getValue('submitted')).toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
  },
  {
    accessorKey: 'category',
    header: 'Category',
    size: 2,
    meta:{
      class:{
        td: 'max-w-20'
      }
    }
  },
  {
    accessorKey: 'title',
    header: 'Title',
    size: 10000
  },

    {
    id: 'actions',
    meta: {
      class: {
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      if (row.original.status !== 'pending' && !row.original.reviewer) return
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

function getRowItems(row: Row<AbstractReviewable>) {
  return [
    {
      label: 'Review',
      icon: 'i-lucide-eye',
      onSelect() {
        openSubmissionForm.value = true;
        state.id = row.original.id;
        state.abstract = row.original.abstract;
        state.category = row.original.category;
        state.title = row.original.title;
      }
    },
  ]
}

const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})

const globalFilter = ref('')
const hasSubmissions = ref(false);
const openSubmissionForm = ref(false)
let action = ref<'approved' | 'rejected'>('rejected');

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	try {
        if(!reviewerId.value) {
          throw new Error('No Reviewer Found');
        }
        

        const formData = submission.data as Schema;

        if(congressAbstract.value == null || congressAbstract.value == undefined) {
            throw new Error('Congress Abstracts Missing');
        }

        const payload = {
            reviewer: reviewerId.value,
            status: action.value
        }

        if(state.id) {
            const response = await $directus.request<AbstractSubmission>(updateItem(
                'abstract_submissions', formData?.id ,payload
            )) 
            
            const updatedRow = reviewTable.value.find(row => row.id == state.id)

            if(updatedRow) {
                updatedRow.status = response.status || 'pending';
            }

            toast.add({ title: 'Success', description: `Abstract ${action.value}`, color: action.value == 'approved' ? 'success' : 'warning' })
        
        }
        resetState();
        openSubmissionForm.value = false;
	} catch (e) {
        console.log(e);
	} finally{
        storeReady.value = true;
    }
};

const onPageChange = (newPage: number) => {
  console.log('Table page changed to', newPage);

};

const columnFilters = ref([
  {
    id: 'status',
    value: ''
  }
])

</script>


<template>
  <div class="w-full space-y-4 pb-4 max-w-300 m-auto lg:mt-10">
      <Headline headline="Abstract Review"/> 
    <div class="flex px-4 py-3.5 border-b border-accented" >
      <UInput v-model="globalFilter" class="max-w-sm" placeholder="Filter..." />
    </div>
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
                <Headline headline="Reviewing Abstract Submission"/>
                <UForm 
                      @submit="handleSubmit"
                      :schema="schema"
                      :state="state">
                      <UInput type="hidden" v-model="state.id"/>
                      <UFormField required label="Category" name="category" size="xl"  class="pb-5">
                          <UInput disabled :value="state.category" v-model="state.category" class="w-75 md:w-100 lg:w-100" color="secondary" variant="subtle"/>
                      </UFormField>
                      <UFormField required label="Title" name="title"  size="xl"  class="pb-5">
                          <UInput disabled v-model="state.title" class="w-75 md:w-100 lg:w-200" color="secondary" variant="subtle"  />
                      </UFormField>
                      <UFormField required label="Abstract" name="abstracr"  size="xl"  class="pb-5">
                          <UTextarea disabled v-model="state.abstract" class="w-75 md:w-100 lg:w-200" :rows=15 color="secondary" variant="subtle"/>
                      </UFormField>
                      <div class="flex justify-between">
                        <UButton 
                            label="Reject"
                            color="error"
                            variant="solid"
                            size="xl"
                            type="submit"
                            @click="action='rejected'">
                        </UButton>
                        
                        <UButton 
                            label="Cancel"
                            color="neutral"
                            variant="outline"
                            size="xl"
                            type="button"
                            @click="() => {resetState(); openSubmissionForm = false}">
                        </UButton>
                        
                        <UButton 
                            label="Approve"
                            color="success"
                            variant="solid"
                            size="xl"
                            type="submit"
                            @click="action='approved'">
                        </UButton>
                      </div>
                  </UForm>
            </div>
        </template>
    </UModal>
    <USelect
        :multiple="true"
        :items="categories"
        :model-value="table?.tableApi?.getColumn('category')?.getFilterValue() as string"
        class="max-w-sm"
        placeholder="Filter Categories..."
        @update:model-value="table?.tableApi?.getColumn('category')?.setFilterValue($event)"
      />
    <USelect
        :multiple="true"
        :items="['pending', 'approved' , 'rejected']"
        :model-value="table?.tableApi?.getColumn('status')?.getFilterValue() as string"
        class="max-w-sm"
        placeholder="Filter Status..."
        @update:model-value="table?.tableApi?.getColumn('status')?.setFilterValue($event)"
      />
    <UTable
      ref="table"
      v-model:pagination="pagination"
      v-model:global-filter="globalFilter"
      :data="reviewTable"
      :columns="columns"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel()
      }"
      @update:page="onPageChange"
      class="flex-1"
    />

    <div class="flex justify-end border-t border-default pt-4 px-4">
      <UPagination 
        :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
        :items-per-page="table?.tableApi?.getState().pagination.pageSize"
        :total="table?.tableApi?.getFilteredRowModel().rows.length"
        @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
        color="accent"
        variant="outline"
        active-color="accent"
      />
    </div>
  </div>  
  {{table?.tableApi?.getState().pagination.pageIndex +1 }}
</template>
