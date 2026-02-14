<script setup lang="ts">
import { withLeadingSlash, withoutTrailingSlash } from 'ufo';
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { createItem, readItems, deleteItem, updateItem } from '@directus/sdk';
import type { AbstractReview, AbstractSubmission, CongressAbstracts } from '~~/shared/types/schema';
import type { AccordionItem } from '@nuxt/ui'
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { getPaginationRowModel } from '@tanstack/vue-table'
import type { TableColumn } from '@nuxt/ui'
import { ConfirmationModal } from "~/components/ui/modal";
import { UBadge } from '#components';

const toast = useToast();
const config = useRuntimeConfig();

const route = useRoute();

const overlay = useOverlay()
const confirmationModal = overlay.create(ConfirmationModal);

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
let required_reviewers = 3;
watch(
  storeReady,
  async (ready) => {
    if (!ready) return
    const { data } = await useAsyncData <CongressAbstracts[]>('abstract_review', async() => {
        return await $directus.request<CongressAbstracts[]>(readItems(
          'abstracts',
          {   
              limit: 1,
              fields: [
                'id', 
                'categories', 
                'submission_deadline', 
                'acceptance_limit',
                'required_reviewers',
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
    required_reviewers =  congressAbstract.value?.required_reviewers || 0;
    reviewerId.value = isAuthenticated.id;
    categories.value = congressAbstract?.value?.categories;
  })



watch(
  storeReady,
  async (ready) => {
    if (!ready) return
   
    // Fetch submissions once the store is ready
    const { data } = await useAsyncData('review', async () => {
      return await $directus.request<AbstractSubmission[]>(readItems(
        'abstract_submissions',
        {
          alias: {
            my_reviews: 'reviews',
          },
          limit: -1,
          fields: [
            'id',
            'status',
            'date_created',
            'reviews.submission',
            {
              my_reviews: [
                'id',
                'reviewer',
                'score'
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
            submitter:{
              _neq: "$CURRENT_USER"
            },
            'count(reviews)': {
              _lt: required_reviewers as number
            }
           
          },
          deep: {
            my_reviews: {
              _limit: 1,
              _filter:{
                reviewer :{
                  _eq: "$CURRENT_USER"
                }
              }
            },
            reviews:{
              _groupBy: ['submission'],
              _aggregate: {
                count: '*'
              },  
              _sort: [],
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
                const reviewed = submission.my_reviews && submission.my_reviews.length > 0 ? submission?.my_reviews[0] as AbstractReview : null;
                const reviews = submission.reviews && submission.reviews.length > 0 ? submission.reviews[0] : null;
                const reviewCount = reviews?.count || 0;
                const required_reviewers = congressAbstract?.value?.required_reviewers || 0;
                // Merge with status and submitted
                return {
                    id: submission.id,
                    status: submission.status,
                    review: reviewed ? reviewed.id : null,
                    reviewer: reviewed ? reviewed.reviewer : null,
                    reviews: reviews ? +reviews.count : 0,
                    reviewable: reviews ? reviews.count < required_reviewers || reviewed : true,
                    score: reviewed ? reviewed.score : null,
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
  score: z.number().min(0, 'Score Between 0 and 5').max(5, 'Score Between 10 and 5')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<AbstractReviewable>>({
  id: undefined,
  title: undefined,
  abstract: undefined,
  category: undefined,
  status: undefined,
  score: 0,
})

function resetState() {
  state.id = undefined,
  state.title = undefined;
  state.abstract = undefined;
  state.category = undefined;
  state.status = undefined;
  state.score = 0;
  state.review = undefined;
  state.reviewer = undefined
}

type AbstractReviewable = {
  id: string
  title: string
  category: string
  date: number
  abstract: string
  review: string
  reviewer: string
  status: 'submitted' | 'invited' | 'accepted' | 'reviewed' | 'waitingList' | 'rejected'
  score: number | null,
  reviewable: boolean,
  reviews:  number,
}

const columns: TableColumn<AbstractReviewable>[] = [
  /*{
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
      }[row.getValue('status') as string] || 'success'

      return h(UButton, {disabled: row.original.reviewable, size: 'xs', class: 'capitalize', variant: 'subtle', color, onClick: () => {
        openSubmissionForm.value = true;
        state.id = row.original.id;
        state.review = row.original.review;
        state.score = row.original.score;
        state.abstract = row.original.abstract;
        state.category = row.original.category;
        state.title = row.original.title;} }, () =>
        row.getValue('status')
      )
    }
  },*/
  {
     accessorKey: 'reviews',
     meta:{
      class:{
        td: 'w-5'
      }
    },
     header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Reviews',
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
      const color = {
        null: 'light' as const,
      }[row.original.review as string] || 'success'
      return h(UBadge, 
        {
          color,
          label: render
        }
        )
    }
  },
  {
     accessorKey: 'score',
     meta:{
      class:{
        td: 'w-5'
      }
    },
     header: ({ column }) => {
      const isSorted = column.getIsSorted()

      return h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        label: 'Your Score',
        icon: isSorted
          ? isSorted === 'asc'
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-down-wide-narrow'
          : 'i-lucide-arrow-up-down',
        class: '-mx-2.5',
        onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
      })
    }
  },
  {
    accessorKey: 'title',
    header: 'Title',
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
    accessorKey: 'submitted',
    header: 'Submitted',
    meta:{
      class:{
        td: 'w-5'
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

const rowSelection = ref<Record<string, boolean>>({})

function onSelect(e: Event, row: TableRow<Payment>) {
  /* If you decide to also select the column you can do this  */

  openSubmissionForm.value = true;
  state.id = row.original.id;
  state.review = row.original.review;
  state.score = row.original.score;
  state.abstract = row.original.abstract;
  state.category = row.original.category;
  state.title = row.original.title;
  
}

const pagination = ref({
  pageIndex: 1,
  pageSize: 10
})

const globalFilter = ref('')
const hasSubmissions = ref(false);
const openSubmissionForm = ref(false)
let action = ref<'approved' | 'delete'>('delete');

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {

  if(action.value == 'approved'){
    try {
          if(!reviewerId.value) {
            throw new Error('No Reviewer Found');
          }
          

          const formData = submission.data as Schema;

          if(congressAbstract.value == null || congressAbstract.value == undefined) {
              throw new Error('Congress Abstracts Missing');
          }

          const payload = {
              submission: formData?.id,
              reviewer: reviewerId.value,
              score: formData.score | 0,
          }
          
          if(!state.review) {
              const response = await $directus.request<AbstractReview>(createItem(
                  'abstract_reviews' , payload
              )) 
              
              const updatedRow = reviewTable.value.find(row => row.id == state.id)

              if(updatedRow) {
                  updatedRow.status = 'submitted';
                  updatedRow.review = response.id;
                  updatedRow.score = response?.score || 0;
                  updatedRow.reviews = updatedRow.reviews + 1;
              }

              toast.add({ title: 'Success', description: `Abstract Score Submitted`, color: 'success' })
          
          } else {
            const response = await $directus.request<AbstractReview>(updateItem(
                  'abstract_reviews', state.review as string , payload
              )) 
              
              const updatedRow = reviewTable.value.find(row => row.id == state.id)

              if(updatedRow) {
                  updatedRow.status = 'reviewed';
                  updatedRow.score = response?.score || 0;
              }

              toast.add({ title: 'Success', description: `Abstract Score Submitted`, color: 'success' })
          }
          resetState();
          openSubmissionForm.value = false;
    } catch (e) {
          console.log(e);
    } finally{
          storeReady.value = true;
      }
  }
  else {
      const instance = confirmationModal.open({
          title: "Confirm Delete.",
          helpMessage: "This action is irreversible, are you sure you want to delete your review?",
          helpMessageData: ''
        })

        await instance.result.then((result) => {if(result) deleteReview(state.review)})

        //
        openSubmissionForm.value = false;
  }
};

const deleteReview = async(reviewId: string | undefined) => {

  if(!reviewId) {
    console.log('No Review');
    return;
  }

  try{

    const response = await $directus.request<AbstractReview>(deleteItem(
                    'abstract_reviews' , reviewId
    ))

    const updatedRow = reviewTable.value.find(row => row.id == state.id)

    if(updatedRow) {
        updatedRow.status = 'submitted';
        updatedRow.review = '';
        updatedRow.score = null;
        updatedRow.reviews = updatedRow.reviews - 1;
    }
    resetState();
    toast.add({ title: 'Success', description: `Abstract Review Deleted`, color: 'success' })

  }
  catch(error) {
    console.log(error);
  }
}


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
    <UError
    v-if="isLoggedIn"
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
  <div v-else class="w-full space-y-4 pb-4 max-w-300 m-auto lg:mt-10">
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
                          <UInput disabled :value="state.category" v-model="state.category" class="w-75 :w-100 md:w-100 lg:w-100 mx-auto" color="secondary" variant="subtle"/>
                      </UFormField>
                      <UFormField required label="Title" name="title"  size="xl"  class="pb-5">
                          <UInput disabled v-model="state.title" class="w-75 md:w-100 lg:w-200" color="secondary" variant="subtle"  />
                      </UFormField>
                      <UFormField required label="Abstract" name="abstract"  size="xl"  class="pb-5">
                          <UTextarea disabled v-model="state.abstract" class="w-75 md:w-100 lg:w-200" :rows=15 color="secondary" variant="subtle"/>
                      </UFormField> 
                      <UFormField required label="Score" name="score" help="Give the abstract a score out of 5. Where 5 is the best possible score." size="xl" class="mx-auto" :ui="{labelWrapper: 'justify-center', root: 'text-center'}"> 
                          <UInputNumber color="accent" :default-value="0" :min="0" :max="5" :step="1" :value="state.score || 0" v-model="state.score"/>
                      </UFormField>
                      <div class="flex justify-between pt-4"> 
                        <UButton 
                            v-if="state.review"
                            label="Delete Review"
                            color="error"
                            variant="solid"
                            size="sm"
                            type="submit"
                            @click="action='delete'">
                        </UButton>                   
                        <UButton 
                            label="Cancel"
                            color="neutral"
                            variant="outline"
                            size="sm"
                            type="button"
                            @click="() => {resetState(); openSubmissionForm = false}">
                        </UButton>
                        
                        <UButton 
                            :label="state.review ? 'Update Score' : 'Submit'"
                            color="success"
                            variant="solid"
                            size="sm"
                            type="submit"
                            @click="action='approved'">
                        </UButton>
                      </div>
                  </UForm>
            </div>
        </template>
    </UModal>
    <USelectMenu
        :multiple="false"
        :search-input="false"
        clear
        :items="categories"
        :model-value="table?.tableApi?.getColumn('category')?.getFilterValue() as string"
        class="max-w-sm"
        placeholder="Filter Categories..."
        @update:model-value="table?.tableApi?.getColumn('category')?.setFilterValue($event)"
      />
    <USelectMenu
        :multiple="false"
        :search-input="false"
        clear
        :items="['accepted', 'invited' , 'reviewed', 'submitted', 'waiting list', 'rejected']"
        :model-value="table?.tableApi?.getColumn('status')?.getFilterValue() as string"
        class="max-w-sm"
        placeholder="Filter Status..."
        @update:model-value="table?.tableApi?.getColumn('status')?.setFilterValue($event)"
      />
    <UTable
      ref="table"
      v-model:row-selection="rowSelection"
      @select="onSelect"
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
</template>
