<script setup lang="ts">
import { readProviders, customEndpoint, readMe } from '@directus/sdk'
const { $directus, $isAuthenticated } = useNuxtApp()

const isAuthenticated = $isAuthenticated();
const route = useRoute();
const user = ref(null);
const isLoggedIn = ref(false);
const redirect = route.query.redirect as string;

const runtimeConfig = useRuntimeConfig();
const loginurl = runtimeConfig.public.loginUrl || '';

const checkLoginStatus = async () => {
  try {
    // readMe() is the standard way to fetch the current authenticated user
    const response = await $isAuthenticated();
    isLoggedIn.value = true;
    console.log('Logged in as:', response);
    console.log(redirect);

    if(redirect) navigateTo(redirect);
    else navigateTo('/');
    
  } catch (error) {
    isLoggedIn.value = false;
    user.value = null;
    console.log(error);
    console.log('Not logged in or session expired');
  }
};

onMounted(async () => {
  try {
    const response = await $directus.refresh({
        mode: 'session',
    });
    checkLoginStatus();
    // User is now authenticated in the SDK state
  } catch (err) {
    console.log(err);
    navigateTo(loginurl, {external: true});
    // This will error if they aren't logged in yet; 
    // you can redirect them to the SSO login link here
  }
});

</script>
<template>

     <div class="text-black w-full h-full flex items-center justify-center">
      <UProgress color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50"/>
   </div>
</template>
