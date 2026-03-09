<script setup lang="ts">
definePageMeta({
  layout: 'login',
})

import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { passwordRequest, passwordReset } from '@directus/sdk';
import PersonSelectMenu from '~/components/ui/dynamic-select-menus/PersonSelectMenu.vue';
import RoleSelectMenu from '~/components/ui/dynamic-select-menus/RoleSelectMenu.vue';

const { $directus } = useNuxtApp();
const loading = ref(false)

const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.siteData;
const config = useRuntimeConfig();

const schema = z.object({
  email: z.string().email('Invalid email'),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
})

const toast = useToast();

async function onSubmit(event: FormSubmitEvent<Schema>) {
    loading.value = true;
    console.log(event);
    const data = event.data;
    try {
        const response = await $directus.request(passwordRequest(data.email, config.public.siteUrl + '/reset_password'));
        console.log(response);
        toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
    } catch (error) {
        console.log(error)
    } finally {
        loading.value = false;
    }
}
</script>

<template>

    <div class="flex flex-col items-center justify-center gap-4 p-4 h-lvh">
        <UPageCard class="w-full max-w-md " title="Fogotten Password?" description="Enter your email below to receive a password reset link.">
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
                <UFormField>
                    <PersonSelectMenu></PersonSelectMenu>
                    <RoleSelectMenu></RoleSelectMenu>
                </UFormField>
                <UFormField label="Email" name="email">
                <UInput v-model="state.email" />
                </UFormField>
                <UButton color="accent" type="submit" :loading="loading">
                    Request password reset
                </UButton>
            </UForm>
        </UPageCard>
  </div>
</template>