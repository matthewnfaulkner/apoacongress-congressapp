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

const toast = useToast();
const config = useRuntimeConfig();

const route = useRoute();
const overlay = useOverlay();
const { $directus, $isAuthenticatedWithPolicy, $hasPolicy } = useNuxtApp();

const { locale, locales, defaultLocale } = useI18n();
const path = withoutTrailingSlash(withLeadingSlash(route.path));
const permalink = locale.value === defaultLocale ?  path : '/';

const isAuthenticated = await $isAuthenticatedWithPolicy('Abstracts - Admin');

const isLoggedIn = computed(() =>
  isAuthenticated ? true: false
)

const loading = ref(true);

const table = useTemplateRef('table')
const submissions = ref<AbstractSubmission[] | null>(null)
const storeReady = ref(false)
const categories = ref([]);

onMounted(async () => {
  // if your store has a fetch method, call it here
  loading.value = false;
  if(isLoggedIn.value) {
    storeReady.value = true
  }
})


const congressAbstract = ref<CongressAbstracts | null>(null);
const reviewTable = ref<AbstractSummary[]>([]);
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
                'required_reviewers',
                'acceptance_limit',
              ],
              filter: {
                congress: {
                  site: {
                    _eq: config.public.siteId
                  }
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
    reviewerId.value = isAuthenticated.id;
    categories.value = congressAbstract?.value?.categories;
  })



watch(
  storeReady,
  async (ready) => {
    if (!ready) return
   
    // Fetch submissions once the store is ready
    const { data } = await useAsyncData('allsubmissions', async () => {
      return await $directus.request<AbstractSubmissionWithReviews[]>(readItems(
        'abstract_submissions',
        {
          limit: -1,
          alias: {
            reviewers: 'reviews'
          },
          fields: [
            'id',
            'status',
            'date_created',
            'reviews.submission',
            {
              reviewers:[
                'id',
                'score',
                {
                  'reviewer': [
                    'id',
                    'first_name',
                    'last_name'
                  ]
                }
              ]
            },
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
          },
          sort: 'reviews',
          deep: {
            reviews:{
              _groupBy: ['submission'],
              _aggregate: {
                avg: ['score'],
                count: '*'
              },  
              _sort: [],
            }
          }
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
                
                const reviews = submission.reviews && submission.reviews.length > 0 ? submission.reviews[0] : null;
                const reviewers = submission.reviewers && submission.reviewers.length > 0 ? submission.reviewers as Reviewer[] : null;
                // Merge with status and submitted
                return {
                    id: submission.id,
                    status: submission.status,
                    reviews: reviews ? reviews.count as number : 0,
                    reviewers: reviewers || [],
                    avgscore: reviews ? (+reviews?.avg?.score).toFixed(2) : 0,
                    submitted: submission.date_created,
                    ...valuesObj
            };
        });
    }
        

    }
  }// run immediately if storeReady is already true
)

interface Reviewer {
  id: string,
  score: number,
  reviewer:{
    id: string
    first_name: string
    last_name: string
  }
}

interface AbstractSubmissionWithReviews extends  Omit<AbstractSubmission, 'reviews'>  {
  reviewers: Reviewer[],
  reviews: [
      {
        id: string
        count: number
        avg: {
          score: number
        }
    }
  ]
}

type AbstractSummary = {
  id: string
  title: string
  category: string
  date: number
  abstract: string
  authors: [
    {
      name: string,
      institution: string,
    }
  ]
  reviews: string
  reviewers: [
    { 
      reviewer: {
        id: string
        first_name: string
        last_name: string
      }
    }
  ]
  status: 'submitted' | 'invited' | 'accepted' | 'reviewed' | 'waitingList' | 'rejected'
  score: number

}

const columns: TableColumn<AbstractSummary>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
    meta:{
      class:{
        td: 'w-5'
      }
    },
    cell: ({ row }) => {
      const color = {
        submitted: 'neutral' as const,
        rejected: 'error' as const,
        waitingList: 'warning' as const,
        invited: 'info' as const,
        accepted: 'success' as const,
        reviewed: 'secondary' as const,
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
    accessorKey: 'reviews',
    meta:{
      class:{
        td: 'w-5 text-wrap whitespace-normal'
      }
    },
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Reviewed',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
    cell: ({row}) => {
      const render = `${row.getValue('reviews')} / ${congressAbstract.value?.required_reviewers}`
      const reviewers = row.original.reviewers.flatMap((reviewer) => `${reviewer.reviewer.first_name} ${reviewer.reviewer.last_name}`).join(', ');
      console.log(reviewers);
      return h(UTooltip, 
        {
          delayDuration: "0", 
          text: reviewers
        }, 
        h(UButton, {label: render, variant: 'outline', color: 'neutral'}))
    }
  },
  {
    accessorKey: 'avgscore',
    meta: {
      class: {
        td: 'w-2'
      }
    },
    header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Avg Score',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    size: 2,
    meta:{
      class:{
        td: 'max-w-20 text-wrap whitespace-normal'
      }
    }
  },
  {
    accessorKey: 'title',
    header: 'Title',
  },
    {
    accessorKey: 'submitted',
    header: 'Date',
    meta:{
      class:{
        td: 'max-w-5 text-wrap whitespace-normal'
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
]

const state = reactive<Partial<AbstractSummary>>({
  id: undefined,
  title: undefined,
  abstract: undefined,
  category: undefined,
  status: undefined,
  authors: undefined,
  score: undefined,
  reviewers: undefined
})

function resetState() {
  state.id = undefined,
  state.title = undefined;
  state.abstract = undefined;
  state.category = undefined;
  state.status = undefined;
  state.authors = undefined;
  state.reviewers = undefined;
}

function onSelect(e: Event, row: TableRow<AbstractSummary>) {
  /* If you decide to also select the column you can do this  */

  openSubmissionForm.value = true;
  state.id = row.original.id;
  state.abstract = row.original.abstract;
  state.category = row.original.category;
  state.title = row.original.title;
  state.authors = JSON.parse(row.original.authors)
  state.score = row.original.avgscore
  state.reviewers = row.original.reviewers
}


const pagination = ref({
  pageIndex: 0,
  pageSize: 10
})


const globalFilter = ref('')
const hasSubmissions = ref(false);
const openSubmissionForm = ref(false)

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
  <div v-if="loading" class="text-black w-full h-full flex items-center justify-center">
        <UProgress color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50"/>
  </div>
  <UError
    v-if="!isLoggedIn && !loading"
    :clear="{
      color: 'neutral',
      size: 'xl',
      icon: 'i-lucide-arrow-left',
      class: 'rounded-full'
    }"
    :error="{
      statusCode: 404,
      statusMessage: 'Permission Denied',
      message: 'You don\'t Have permission to view this page'
    }"
  />
  <div v-else-if="!loading" class="w-full space-y-4 pb-4 max-w-300 m-auto lg:mt-10">
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
                      :state="state">
                      <UInput type="hidden" v-model="state.id"/>
                      <UFormField required label="Category" name="category" size="xl"  class="pb-5">
                          <UInput disabled :value="state.category" v-model="state.category" class="w-75 :w-100 md:w-100 lg:w-100 mx-auto" color="secondary" variant="subtle"/>
                      </UFormField>
                      <UFormField required label="Title" name="title"  size="xl"  class="pb-5">
                          <UInput disabled v-model="state.title" class="w-75 md:w-100 lg:w-200" color="secondary" variant="subtle"  />
                      </UFormField>
                      <UFormField required label="Abstract" name="abstract"  size="xl"  class="pb-5">
                          <UTextarea disabled v-model="state.abstract" class="w-75 md:w-100 lg:w-200" :rows=15 color="secondary" variant="subtle"/>
                      </UFormField> 
                      <UFormField required label="Authors" name="authors" size="xl" class="text-center pb-5" >
                        <div v-for="(author, index) in state.authors" :key="index" class="flex lg:gap-2 mb-2">
                            <UInput disabled v-model="author.name" placeholder="Name" class="lg:w-95" color="secondary" variant="subtle"/>
                            <UInput disabled v-model="author.institution" placeholder="Institution" class="lg:w-95" color="secondary" variant="subtle"/>
                        </div>
                    </UFormField>
                    <UFormField required label="Average Score" name="score" size="xl" class="mx-auto" :ui="{labelWrapper: 'justify-center', root: 'text-center'}"> 
                          <UInput disabled color="accent" :value="state.score || 0" v-model="state.score" />
                    </UFormField>
                    <UFormField label="Reviewers" name="reviewers" size="xl" class="mx-auto">
                        <div v-for="(reviewer, index) in state.reviewers" :key="index" class="flex lg:gap-2 mb-2">
                          <UFormField :label="`${reviewer.reviewer.first_name} ${reviewer.reviewer.last_name} - Score :`" orientation="horizontal">
                            <UInput disabled  v-model="reviewer.score" placeholder="score" class="" color="secondary" variant="subtle"/>
                          </UFormField>
                        </div>
                    </UFormField>
                  </UForm>
            </div>
        </template>
    </UModal>
    <Headline headline="All Abstracts"/> 
    <div class="flex px-4 py-3.5 border-b border-accented" >
      <UInput v-model="globalFilter" class="max-w-sm" placeholder="Filter..." />
    </div>
    <USelectMenu
        clear
        :multiple="false"
        :search-input="false"
        :items="categories"
        :model-value="table?.tableApi?.getColumn('category')?.getFilterValue() as string"
        class="max-w-sm"
        placeholder="Filter Categories..."
        @update:model-value="table?.tableApi?.getColumn('category')?.setFilterValue($event)"
      />
    <USelectMenu
        clear
        :search-input="false"
        :multiple="false"
        :items="['accepted', 'invited' , 'reviewed', 'submitted', 'waiting list', 'rejected']"
        :model-value="table?.tableApi?.getColumn('status')?.getFilterValue() as string"
        class="max-w-sm"
        placeholder="Filter Status..."
        @update:model-value="table?.tableApi?.getColumn('status')?.setFilterValue($event)"
      />
    <UTable
      ref="table"
      v-model:pagination="pagination"
      v-model:global-filter="globalFilter"
      @select="onSelect"
      :data="reviewTable"
      :columns="columns"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel()
      }"
      @update:page="onPageChange"
      class="flex-1"
    />

    <div class="flex justify-end border-t border-default pt-4 px-4">
      <USelect v-model="pagination.pageSize" :items="[10, 25, 100, 1000]" @update:model-value="table?.tableApi?.setPageSize(pagination.pageSize)" />
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
</template>
