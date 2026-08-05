<script setup lang="ts">
import { readItem } from '@directus/sdk';

definePageMeta({
  layout: 'login',
})

const { $directus, $isAuthenticated } = useNuxtApp();
const config = useRuntimeConfig();


const authStore = useAuthStore();
const auth = authStore.isAuthenticated;

const { data: form } = !auth ? {} : await useAsyncData('no-access-form', () =>
  $directus.request(readItem('forms' as any, config.public.requestAccessForm as string, {
    fields: ['*', { fields: ['*'] }, {submissions: ['*']}] as any,
  }))
);


</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4 min-h-lvh">
    <UError
      redirect="/logout"
      :clear="{
        label: 'Log Out',
        color: 'neutral',
        size: 'xl',
        icon: 'i-lucide-arrow-left',
        class: 'rounded-full'
      }"
      :error="{
        statusCode: 403,
        statusMessage: 'Access Denied',
        message: 'You don\'t have permission to access this.'
      }"
    >
    <template #links>
        <UButton to="/logout" label="Log Out" color="neutral" variant="outline" size="xl" icon="i-lucide-arrow-left"/>
        <FormBuilder v-if="form && auth && form.submissions.length == 0" :form="form" className="border-0 px-2  "/>
        <UButton v-else-if="form && auth && form.submissions.length > 0" disabled label="Access Requested" variant="ghost" color="netural" />
    </template>
</UError>
    
  </div>
</template>