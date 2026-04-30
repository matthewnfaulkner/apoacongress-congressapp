<script setup lang="ts">

import { readProviders, customEndpoint, readMe } from '@directus/sdk'
const { $directus, $directusTokenStorage, $isAuthenticated } = useNuxtApp()

const route = useRoute();
const user = ref(null);
const isLoggedIn = ref(false);
const redirect = route.query.redirect as string;

const runtimeConfig = useRuntimeConfig();
const loginurl = runtimeConfig.public.loginUrl || '';

const refreshCookie = useCookie(runtimeConfig.public.refreshTokenName as string);
// Capture on the server during SSR before hydration drops HttpOnly cookies from JS scope
const cookieToken = useState('login_cookie_token', () => refreshCookie.value ?? null);

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
  const ssoToken = (route.query.token ?? route.query.refresh_token ?? cookieToken.value) as string | undefined;
  cookieToken.value = null;

  if (ssoToken) {
  
    try {
      const response = await $fetch<{
        data: { access_token: string; refresh_token: string; expires: number };
      }>(`${runtimeConfig.public.directusUrl}/auth/refresh`, {
        method: 'POST',
        body: { mode: 'json', refresh_token: ssoToken },
      });
      $directusTokenStorage.set({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires: response.data.expires,
        expires_at: Date.now() + response.data.expires,
      });
      await $directus.setToken(response.data.access_token);
    } catch (err) {
      console.error('SSO token refresh failed', err);
    }

    const cleanQuery = { ...route.query };
    delete cleanQuery.token;
    delete cleanQuery.refresh_token;
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
