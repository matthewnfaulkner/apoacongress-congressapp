<script setup lang="ts">
import { withLeadingSlash, withoutTrailingSlash } from 'ufo';
import * as z from 'zod'
import type { FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'
import { readItems, deleteItem } from '@directus/sdk';
import type { AbstractSubmission, AbstractSubmissionValue, AbstractSubmissionFigure, Abstract } from '~~/shared/types/schema';
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
const turnstileRef = ref<{ reset: () => void } | null>(null);

const congressAbstract = ref<Abstract | null>(null);
const submissions = ref<AbstractSubmission[] | null>(null)
const storeReady = ref(false)
const categories = ref<string[]>([]);
const guideLines = ref<AccordionItem>([]);
const guidelinesRef = ref<HTMLElement | null>(null);
const guidelinesOpen = ref<string | undefined>(undefined);

// Used by the consent checkbox's "view submission guidelines" link to jump
// back up to the accordion above the form and expand it, rather than making
// the customer scroll up and click it open themselves.
function openGuidelines(e: Event) {
    e.preventDefault();
    
    guidelinesRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    nextTick(() => guidelinesOpen.value = '0');
}


const { data } = await useAsyncData <Abstract[]>('abstract_submit', async() => {
      return await $directus.request<Abstract[]>(readItems(
        'abstracts',
        {   
            limit: 1,
            fields: ['id', 'categories', 'submission_deadline', 'description', 'submission_limit', 'declaration_statement'],
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

data.value = data.value as Abstract[];

congressAbstract.value = data.value[0] || null;
const submission_limit = congressAbstract.value?.submission_limit || 100;
categories.value = congressAbstract?.value?.categories ?? [];
guideLines.value = [
    {
        label: 'Submission Guidelines',
        content: congressAbstract?.value?.description || '',

    }
]

const submissionsClosed = congressAbstract.value?.submission_deadline
    ? new Date(congressAbstract.value.submission_deadline) < new Date()
    : false;


async function fetchSubmissions() {
  const data = await $directus.request<AbstractSubmission[]>(readItems(
    'abstract_submissions',
    {
      limit: -1,
      fields: [
                'id',
                'status',
                'date_created',
                'user_created',
                'keywords',
                {
                    submission_values: [
                        'id',
                        'field',
                        'value'
                    ]
                },
                {
                    figures: [
                        'id',
                        'label',
                        {
                            file: ['id', 'filename_download']
                        }
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

  submissions.value = (data as AbstractSubmission[]) ?? [];
}

// Watch for storeReady
watch(
  storeReady,
  async (ready) => {
    if (!ready) return

    // Fetch submissions once the store is ready
    await fetchSubmissions();
    loading.value = false
  }// run immediately if storeReady is already true
)


type Submission = {
  id: string
  submitted: string
  status: 'submitted' | 'pending_review' | 'invited' | 'accepted' | 'reviewed' | 'waiting_list' | 'rejected'
  title: string,
  abstract: string,
  category: string,
  authors: string[] | { name: string; title: string; institution: string }[],
  keywords?: string[],
  figures?: { id: string; label: string; file: string | { id: string; filename_download?: string } | null }[],
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
      keywords: submission.keywords ?? [],
      figures: (submission.figures as AbstractSubmissionFigure[]) ?? [],
      ...valuesObj
    } as unknown as Submission;
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
        pending_review: 'info' as const,
        reviewed: 'secondary' as const,
        invited: 'info' as const,
        accepted: 'success' as const,
        waiting_list: 'warning' as const,
        rejected: 'error' as const,
      }[row.getValue('status') as string]

      const label = {
        submitted: 'Submitted',
        pending_review: 'Pending Review',
        reviewed: 'Reviewed',
        invited: 'Invited',
        accepted: 'Accepted',
        waiting_list: 'Waiting List',
        rejected: 'Rejected',
      }[row.getValue('status') as string] ?? row.getValue('status')

      return h(UBadge, { variant: 'subtle', color }, () => label)
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
      const items = getRowItems(row);
      if (!items.length) return null;

      return h(
        UDropdownMenu,
        {
          content: {
            align: 'end'
          },
          items,
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
  const items: { label: string; icon: string; onSelect: () => void }[] = [];
  if (row.original.status === 'submitted') {
    items.push({
      label: 'Edit',
      icon: 'i-lucide-settings',
      onSelect() {
        openSubmissionForm.value = true;
        state.id = row.original.id;
        state.abstract = row.original.abstract;
        state.authors = row.original.authors ? JSON.parse(row.original.authors) : {};
        state.category = row.original.category;
        state.title = row.original.title;
        state.keywords = row.original.keywords ? [...row.original.keywords] : [];
        state.figures = row.original.figures?.length
          ? row.original.figures.map(figure => ({
              id: figure.id,
              label: figure.label ?? '',
              file: typeof figure.file === 'string' ? figure.file : (figure.file?.id ?? null),
              existingFilename: typeof figure.file === 'string' ? undefined : figure.file?.filename_download,
            }))
          : [];
        state.consent = true;
      }
    });
  }
  items.push({
    label: 'Delete',
    icon: 'i-lucide-trash',
    onSelect() {
      openConfirmation.value = true
      toBeDeleted.value = row.original
    }
  });
  return items;
}

const schema = z.object({
  id: z.any().nullable(),
  
  category: z.string({ required_error: 'Category is required' }),
  title: z.string({ required_error: 'Title is required' }).max(150, "Max 150 Characters"),
  keywords: z.array(z.string().trim().nonempty("Keyword cannot be empty"))
    .min(3, "At least 3 keywords are required")
    .max(5, "Maximum of 5 keywords allowed"),
  abstract: z.string({ required_error: 'Abstract is required' }).refine(
    (val) => val.trim().split(/\s+/).filter(Boolean).length <= 250,
    { message: 'Max 250 Words' },
  ),
  authors: z.array(
    z.object({
        title: z.string().nonempty("Author Title is required"),
        name: z.string().nonempty("Author name is required"),
        institution: z.string().nonempty("Author Institution is required")
    })
  ).min(1, "At least one author is required").refine(authors =>
    authors.every(a => a.title.trim() !== "" && a.name.trim() !== "" && a.institution.trim() !== ""),
    { message: "All authors must have a title, name, and institution" }
  ),

  figures: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).optional(),
      file: z.any().nullable(),
      label: z.string().nonempty("Figure label is required"),
      existingFilename: z.string().optional(),
    })
  ).max(3, "Maximum of 3 figures allowed").refine(figures =>
    figures.every(f => !!f.file),
    { message: "Each figure must have an image uploaded" }
  ),
  conflict: z.boolean(),
  conflictDisclosure: z.string(),
  consent: z.boolean().refine(val => val === true, {
    message: "You must give your consent",
  })
}).refine(
  (data) => !data.conflict || data.conflictDisclosure.trim() !== "",
  {
    message: "Please describe the conflict of interest",
    path: ["conflictDisclosure"], // attaches the error to that field, not the whole object
  }
)

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
  keywords: [],
  figures: [],
  conflict: false,
  consent: false,
  conflictDisclosure: ''
})

function resetState() {
  state.id = undefined,
  state.title = undefined;
  state.abstract = undefined;
  state.authors = [{title: '', name: '', institution: '' }];
  state.category = undefined;
  state.keywords = [];
  state.figures = [];
  state.conflict = false;
  state.conflictDisclosure = '',
  state.consent = false;
  error.value = [];
  turnstileToken.value = undefined;
  turnstileRef.value?.reset();
}


type FigureState = { id?: string | number; file?: File | string | null; label: string; existingFilename?: string };

const formRef = ref();
const figureInputRefs = ref<(HTMLInputElement | null)[]>([]);

function setFigureInputRef(el: any, index: number) {
    figureInputRefs.value[index] = el as HTMLInputElement | null;
}

async function revalidateFigures() {
    await formRef.value?.validate({ name: 'figures', silent: true });
}

const FIGURE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
// Same list enforced again server-side (upload-figure.post.ts) — this is
// just for immediate feedback without a round trip.
const FIGURE_ALLOWED_TYPES = ['image/jpeg', 'image/png'];

function onFigureFileChange(e: Event, index: number) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!FIGURE_ALLOWED_TYPES.includes(file.type)) {
        error.value = ['Figures must be JPEG or PNG images.'];
        return;
    }
    if (file.size > FIGURE_MAX_BYTES) {
        error.value = ['Figures must be under 5 MB.'];
        return;
    }
    (state.figures as FigureState[])[index].file = file;
    revalidateFigures();
}

function figureFileName(figure: FigureState) {
    if (figure.file instanceof File) return figure.file.name;
    return figure.existingFilename ?? '';
}

// Existing figures come back from Directus as just a file id, permission-
// restricted (read scoped to uploaded_by == $CURRENT_USER — see
// figure.get.ts), so unlike a plain public asset URL this has to be fetched
// with the logged-in user's own credentials and turned into a blob URL —
// same technique support/[...id].vue's openFile() uses for restricted
// attachments. Cached by file id so each figure is only fetched once.
const figurePreviewCache = ref<Record<string, string>>({});

async function loadFigurePreview(fileId: string) {
    if (figurePreviewCache.value[fileId]) return;
    const { $directusTokenStorage } = useNuxtApp();
    const accessToken = config.public.isSandbox ? null : ($directusTokenStorage as any).get()?.access_token;
    try {
        const response = await fetch(`/api/abstracts/figure?id=${fileId}`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!response.ok) return;
        const blob = await response.blob();
        figurePreviewCache.value[fileId] = URL.createObjectURL(blob);
    } catch {
        // Leave uncached — figureFilePreview falls back to '' and that
        // figure's preview just won't render, rather than breaking the form.
    }
}

watch(
    () => state.figures,
    (figures) => {
        for (const figure of figures ?? []) {
            if (typeof figure.file === 'string') loadFigurePreview(figure.file);
        }
    },
    { immediate: true, deep: true },
);

function figureFilePreview(figure: FigureState) {
    if (figure.file instanceof File) return URL.createObjectURL(figure.file);
    if (typeof figure.file === 'string') return figurePreviewCache.value[figure.file] ?? '';
    return '';
}

const error = ref<string[]>([]);

function onFormError(event: FormErrorEvent) {
    const messages = event.errors?.map(e => e.message).filter(Boolean) as string[] ?? [];
    error.value = messages.length ? messages : ['Please check the highlighted fields and try again.'];
}

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	error.value = [];
	if (!turnstileToken.value) {
		error.value = ['Please complete the CAPTCHA before submitting.'];
		return;
	}

  if(!state.id && (submissions?.value?.length || 0) >= submission_limit) {
    error.value = ['You have reached your submission limit.'];
		return;
  }
  if(submissionsClosed) {
    error.value = ['The deadline for abstract submission has passed.'];
		return;
  }
  if(state.id && submissions.value?.find(s => s.id === state.id)?.status !== 'submitted') {
    error.value = ['This submission can no longer be edited.'];
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

        const { $directusTokenStorage } = useNuxtApp();
        const accessToken = config.public.isSandbox ? null : ($directusTokenStorage as any).get()?.access_token;

        // Upload any newly selected figure images before saving the submission —
        // via our own server route (upload-figure.post.ts) rather than straight
        // to Directus, so the size/format checks are actually enforced and not
        // just a client-side courtesy.
        const figures = await Promise.all((formData.figures ?? []).map(async (figure) => {
            let fileId = typeof figure.file === 'string' ? figure.file : null;
            if (figure.file instanceof File) {
                const fd = new FormData();
                fd.append('file', figure.file, figure.file.name);
                const uploaded = await $fetch<{ id: string }>('/api/abstracts/upload-figure', {
                    method: 'POST',
                    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                    body: fd,
                });
                if (!uploaded?.id) throw new Error('Figure upload failed');
                fileId = uploaded.id;
            }
            return {
                ...(figure.id ? { id: figure.id } : {}),
                file: fileId,
                label: figure.label,
            };
        }));

        await $fetch('/api/abstracts/submission', {
            method: 'POST',
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            body: {
                id: state.id,
                turnstileToken: turnstileToken.value,
                keywords: formData.keywords,
                figures,
                submissionValues: [
                    sv('category', formData.category),
                    sv('title', formData.title),
                    sv('abstract', formData.abstract),
                    sv('authors', JSON.stringify(formData.authors)),
                ],
            },
        });
        await fetchSubmissions();
        resetState();
        openSubmissionForm.value = false;
	} catch (e) {
		error.value = ['Failed to submit the form. Please try again later.'];
        console.log(e);
        turnstileToken.value = undefined;
        turnstileRef.value?.reset();
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
      redirect="/login?redirect=/abstracts/submission"
      :clear="{
        color: 'neutral',
        size: 'xl',
        trailingIcon: 'i-lucide-arrow-right',
        class: 'rounded-full',
        label: 'Sign In',
      }"
      :error="{
        statusCode: 404,
        statusMessage: 'Sign In Required',
        message: 'You need to sign in to submit an abstract'
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
                        <div ref="guidelinesRef">
                        <UAccordion
                            v-model="guidelinesOpen"
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
                        </div>
                        <UForm
                            ref="formRef"
                            @submit="handleSubmit"
                            @error="onFormError"
                            :schema="schema"
                            :state="state">
                            <UInput type="hidden" v-model="state.id"/>
                            <UFormField required label="Category" name="category" size="xl"  class="pb-5">
                                <USelect :items="categories" v-model="state.category" class="w-75 md:w-100 lg:w-100" color="secondary" variant="subtle"/>
                            </UFormField>
                            <UFormField required label="Title" name="title"  size="xl"  class="pb-5">
                                <UInput v-model="state.title" class="w-75 md:w-100 lg:w-200" color="secondary" variant="subtle"  />
                            </UFormField>
                            <UFormField
                                required
                                
                                label="Keywords"
                                name="keywords"
                                size="xl"
                                class="pb-5"
                                :ui="{
                                  hint: 'text-sm wrap max-w-150'
                                }"
                                hint="Add between 3 and 5 keywords describing your abstract."
                                description="Type each keyword followed by a comma.">
                                
                                <UInputTags
                                    v-model="state.keywords"
                                    :max="5"
                                    enterkeyhint="done"
                                    
                                    class="w-75 md:w-100 lg:w-200"
                                    color="secondary"
                                    variant="subtle" />
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
                            
                            <UFormField
                                label="Figures"
                                name="figures"
                                size="xl"
                                class="pb-5"
                                :ui="{
                                  hint: 'text-sm wrap max-w-150'
                                }"
                                hint="Optionally upload up to 3 figures (image files, max 5 MB each), each with a label.">
                                <div v-for="(figure, index) in state.figures" :key="index" class="mb-3 flex flex-col md:flex-row gap-2 md:items-center p-2 rounded-lg border border-default">
                                    <div class="flex items-center gap-3">
                                        <img
                                            v-if="figureFilePreview(figure)"
                                            :src="figureFilePreview(figure)"
                                            alt="Figure preview"
                                            class="w-16 h-16 object-cover rounded" />
                                        <div class="flex flex-col gap-1">
                                            <input
                                                :ref="(el) => setFigureInputRef(el, index)"
                                                type="file"
                                                accept="image/jpeg,image/png"
                                                class="hidden"
                                                @change="(e) => onFigureFileChange(e, index)" />
                                            <UButton
                                                type="button"
                                                variant="outline"
                                                color="secondary"
                                                icon="i-lucide-upload"
                                                :label="figureFileName(figure) ? 'Change Image' : 'Choose Image'"
                                                @click="figureInputRefs[index]?.click()" />
                                            <span v-if="figureFileName(figure)" class="text-xs text-muted">{{ figureFileName(figure) }}</span>
                                        </div>
                                    </div>
                                    <UInput v-model="figure.label" placeholder="" :ui="{ base: 'peer' }"  class="flex-2 font-serif" color="secondary" variant="subtle">
                                    <label class="pointer-events-none absolute left-0 -top-2.5 text-highlighted text-xs font-medium px-1.5 transition-all peer-focus:-top-2.5 peer-focus:text-highlighted peer-focus:text-xs peer-focus:font-medium peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed peer-placeholder-shown:top-1.5 peer-placeholder-shown:font-normal">
                                      <span class="inline-flex bg-default px-1">Figure reference (1, 2a ...etc)</span>
                                    </label>
                                    </UInput>
                                    <UButton
                                        icon="i-lucide-trash"
                                        variant="solid"
                                        color="neutral"
                                        type="button"
                                        class="w-fit"
                                        size="xl"
                                        @click="() => { state.figures!.splice(index, 1); revalidateFigures(); }">
                                    </UButton>
                                </div>
                                <UButton
                                    v-if="state.figures!.length < 3"
                                    type="button"
                                    variant="solid"
                                    color="accent"
                                    label="Add Figure"
                                    icon="i-lucide-plus"
                                    size="xl"
                                    class="m-auto"
                                    @click="() => { state.figures!.push({ file: null, label: '' }); revalidateFigures(); }"/>
                            </UFormField>

                            <UFormField class="py-5 text-bold" size="xl" name="conflict" label="Conflict of Interest Declaration">
                                <URadioGroup 
                                  v-model="state.conflict" 
                                  :items="[
                                    {
                                      value: false,
                                      label: 'I have no conflicts of interest to declare.'
                                    },
                                    {
                                      value: true,
                                      label: 'I need to declare conflicts of interest.'
                                    }
                                  ]"
                                  variant="card"
                                  orientation="vertical"
                                  color="accent"
                                  /> 
                            </UFormField>
                            <UFormField v-if="state.conflict" class="py-5" name="conflictDisclosure" label="">
                              <UTextarea v-model="state.conflictDisclosure" placeholder="Please provide details of the conflicts of interest." class="w-full lg:w-200" :rows=8 color="secondary" variant="subtle"/>
                            </UFormField> 
                            <UFormField  class="py-5" name="consent" label="">
                                <UCheckbox
                                  v-model="state.consent"
                                  size="lg"
                                  variant="card"
                                  :label="congressAbstract?.declaration_statement || 'I hereby agree to the terms and conditions of abstract submission.'" color="accent">
                                  <template #label="{ label }">
                                    <span>{{ label }}</span>
                                    <a href="#" class="text-accent underline ml-1" @click="openGuidelines">View submission guidelines</a>
                                  </template>
                                </UCheckbox>
                            </UFormField>
                            <div>
                            <UFormField  class="py-5 text-center" name="captcha">
                                <NuxtTurnstile ref="turnstileRef" v-model="turnstileToken" />
                            </UFormField>
                            </div>
                            <UAlert v-if="error.length" color="error" variant="subtle" class="mb-3">
                                <template #description>
                                    <p v-if="error.length === 1">{{ error[0] }}</p>
                                    <ul v-else class="list-disc list-inside space-y-0.5">
                                        <li v-for="(message, index) in error" :key="index">{{ message }}</li>
                                    </ul>
                                </template>
                            </UAlert>
                            <div class="w-full text-center">
                              <UButton
                                  :label="state.id ? 'Update' : 'Submit'"
                                  color="accent"
                                  variant="solid"
                                  size="xl"
                                  class="m-auto"
                                  type="submit"
                                  loading-auto>
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
                        The deadline for abstract submissions has passed.
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
