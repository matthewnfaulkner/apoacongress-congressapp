<script setup lang="ts">
definePageMeta({
  layout: 'login',
})

import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { passwordReset } from '@directus/sdk';


const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.siteData;

const route = useRoute();

const token = route.query.token as string || '';

const { $directus } = useNuxtApp();

const schema = z.object({
  password: z.string().min(8, 'Password too short'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  password: undefined,
})

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
    console.log(event);
    const data = event.data;
    try {
        const response = await $directus.request(passwordReset(token, data.password));
        navigateTo('/admin_login');
        toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
    } catch (error) {
        console.log(error)
    } 
}
</script>

<template>

    <div class="flex flex-col items-center justify-center gap-4 p-4 h-lvh">``
        <UPageCard class="w-full max-w-md " title="Reset Password" description="Enter a new password.">
            <template #header class="w-100">
                <UUser
                :name="siteData?.title"
                class="m-auto w-100 text-center"
                size="3xl"
                orientation="vertical"
                >
                <template #avatar>
                    <DirectusImage :uuid="siteData?.logo" class="h-25 w-25 m-auto"/>
                </template>
                </UUser>
            </template>
            <UForm title="Reset Password" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="New Password" name="password">
                <UInput v-model="state.password" />
                </UFormField>
                <UButton color="accent" type="submit">
                    Set new password
                </UButton>
            </UForm>
        </UPageCard>
  </div>
</template>