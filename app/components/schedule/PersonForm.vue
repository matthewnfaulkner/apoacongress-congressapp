<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { createItem, readFields, uploadFiles, readFieldsByCollection} from '@directus/sdk';
import * as z from 'zod'
import CountrySelectMenu from '../ui/dynamic-select-menus/CountrySelectMenu.vue';
import { empty } from '#build/ui';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';

const toast = useToast();

const { $directus } = useNuxtApp();

type Mode = 'create' | 'update';

interface fieldsList {
    collection: string,
    field: string,
    meta: {
        id: number,
        interface: string,
        options?: {
            choices: [
                {
                    value: string,
                    text: string,
                }
            ]
        } 
    }
    special: string,
    options: object,
    translations: []
}


interface eventTypeField {
    id: number,
    meta: {
        one_allowed_collections: string[],
    }

}

const props = defineProps<{
}>()


const emit = defineEmits<{ 
        personCreated: [boolean,Person?],
        personUpdated: [boolean,Person?],
    }>()


const { data } = await useAsyncData <fieldsList[]>('persons', async() => {
    return await $directus.request<fieldsList[]>(readFieldsByCollection('persons'));
})

if(data.value) {
    console.log(data.value);
}

const titleField = data?.value?.find(fieldData => fieldData.field == 'title');
const titleOptions =  titleField?.meta.options?.choices.map(choice => ({value: choice.value, label: choice.text}));

const qualificationsField = data?.value?.find(fieldData => fieldData.field == 'qualifications');
const qualificationsOptions =  qualificationsField?.meta.options?.choices.map(choice => ({value: choice.value, label: choice.text}));

console.log(titleOptions);
console.log(qualificationsOptions);

const state = reactive({
  id: undefined,
  first_name: undefined,
  last_name: undefined,
  title: '',
  qualifications: [],
  affiliations: '',
  country: undefined,
  bio: '',
  image: undefined,
})


const schema = z.object({
    id: z.any().nullable(),
    first_name: z.string('First name is required').max(25, 'Max 25 Characters'),
    last_name: z.string('Last name is required').max(80, 'Max 80 Characters'),
    title: z.string().nullable(),
    qualifications: z.array(
        z.string()
    ),
    country: z.object({
        code: z.string()
    }),
    affiliations: z.string().nullable(),
    bio: z.string().max(500, 'Bio Too Long').nullable(),
    image: z.optional(z.instanceof(File, {
        message: 'File is required',
        }))
})

type Schema = typeof schema

const handleSubmit = async (submission: FormSubmitEvent<Schema>) => {
	try {
        const formData = submission.data as Schema;
        
        let file = undefined;
        console.log(formData.image);

        if(formData.image instanceof File) {
            const image = formData.image;
            const blob = new Blob([image], { type: image.type });
            const uploadFormData = new FormData();
            uploadFormData.append('folder', "7c6a3599-82ce-4bda-92d3-d42f4ba09116");
            uploadFormData.append('file', blob, image.name);

            const uploadedFile = (await $directus.request(uploadFiles(uploadFormData))) as {
                id?: string;
            };

            if (uploadedFile?.id) {
                file = uploadedFile.id
            }
        }
        
        const payload = {
            first_name: formData.first_name,
            last_name: formData.last_name,
            country: JSON.stringify({
                countryCodes: [formData.country.code],
                defaultLocale: formData.country.code.toLowerCase()
            }),
            title: formData.title,
            qualifications: JSON.stringify(formData.qualifications),
            affiliations: formData.affiliations,
            bio: formData.bio,
            image: file,
        }

        
        console.log(payload);
        if(!payload) return;

        const response = await $directus.request<Person>(createItem(
            'persons',
            payload
        ))

        toast.add({ title: 'Success', description: `${response.first_name} ${response.last_name} Created`, color: 'accent'})

        emit("personCreated", true, response);

	} catch (e) {
        console.log(e);
	} 
};

</script>

<template>
    {{ state.assignments }}
  <UForm :state="state" class="space-y-4" @submit="handleSubmit($event)" :schema="schema">
    <UFormField name="id" hidden>
      <UInput hidden v-model="state.id" />
    </UFormField>
    <div class="flex flex-col md:flex-row justify-between">
        <UFormField label="First Name" name="first_name" class="w-full lg:w-50" required>
            <UInput v-model="state.first_name" class=""/>
        </UFormField>
        <UFormField label="Last Name" class="w-full lg:w-50" name="topic" required>
            <UInput v-model="state.last_name" />
        </UFormField>
    </div>
    <div class="flex flex-col md:flex-row justify-between">
        <UFormField label="Title" name="title" class="w-full lg:w-50">
            <USelect :items="titleOptions" v-model="state.title" class="w-40"/>
        </UFormField>
        <UFormField label="Qualifications" class="w-full lg:w-50" name="qualifications">
            <USelect :items="qualificationsOptions" v-model="state.qualifications" class="w-40" multiple />
        </UFormField>
    </div>
     <div class="flex flex-col md:flex-row justify-between">
        <UFormField label="Affiliations" name="afilliations" class="w-full lg:w-50">
            <UInput v-model="state.affiliations"/>
        </UFormField>
        <UFormField label="Country" class="w-full lg:w-50" name="country" required>
            <CountrySelectMenu v-model="state.country" />
        </UFormField>
    </div>
    <UFormField label="Bio" name="bio">
        <UTextarea :rows="8" placeholder="Enter Bio..." class="w-full" v-model="state.bio">

        </UTextarea>
    </UFormField>
    <UFormField label="Image" name="image">
        <UFileUpload accept="image/*" :dropzone="true" v-model="state.image" class="w-96 min-h-48" />
    </UFormField>
    <UButton type="submit" color="accent" variant="solid" :label="editing ? 'Update Event' : 'Add Person'">
    </UButton>
  </UForm>
</template>

