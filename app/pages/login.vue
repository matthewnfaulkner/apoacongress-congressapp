<script setup lang="ts">

import { readProviders, customEndpoint, readMe } from '@directus/sdk'
const { $directus, $directusTokenStorage, $isAuthenticated } = useNuxtApp()

const route = useRoute();
const user = ref(null);
const isLoggedIn = ref(false);
const redirect = route.query.redirect as string;

const runtimeConfig = useRuntimeConfig();
const loginurl = runtimeConfig.public.loginUrl || '';

const checkLoginStatus = async () => {
  try {
    const response = await $isAuthenticated();
    if(response) {
          isLoggedIn.value = true;
          if(redirect) navigateTo(redirect);
          else navigateTo('/');
    }
    else {
      //navigateTo(loginurl, {external: true});
    }
  } catch (error) {
    isLoggedIn.value = false;
    user.value = null;
    console.log('Not logged in or session expired');
  }
};

onMounted(async () => {
  const k = route.query.k as string;

  if (k) {
    try {
      const tokens = await $fetch('/api/auth/exchange', {
        method: 'POST',
        body: { token: k },
      }) as { access_token: string; refresh_token: string; expires: number };

      // Write full token data to storage first so setToken reads it back with refresh_token intact
      $directusTokenStorage.set({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires: tokens.expires,
        expires_at: Date.now() + tokens.expires,
      });
      await $directus.setToken(tokens.access_token);
    } catch (err) {
      console.error('Token exchange failed', err);
    }

    // Clean the exchange key from the URL
    const cleanQuery = { ...route.query };
    delete cleanQuery.k;
    const qs = new URLSearchParams(cleanQuery as Record<string, string>).toString();
    history.replaceState({}, '', route.path + (qs ? `?${qs}` : ''));
  } else {
    try {
      await $directus.refresh();
    } catch (err) {
      console.log(err);
    }
  }

  checkLoginStatus();
});

</script>
<template>
    <div>
     <div class="text-black w-full min-h-lvh flex items-center justify-center">
        <UProgress color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50"/>
      </div>
    </div>
</template>
