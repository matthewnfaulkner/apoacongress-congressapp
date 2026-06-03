<script setup lang="ts">
definePageMeta({
  layout: 'login',
})

const { $directus, $directusTokenStorage, $isAuthenticated, $isAuthenticatedWithPolicy } = useNuxtApp()

const route = useRoute();
const user = ref(null);
const isLoggedIn = ref(false);
const redirect = route.query.redirect as string;

const runtimeConfig = useRuntimeConfig();

// Read the refresh token cookie during SSR — captures it before hydration
// drops HttpOnly cookies from JS scope. Cookie name must match DIRECTUS_REFRESH_TOKEN_NAME.
const refreshCookie = useCookie(runtimeConfig.public.refreshTokenName || 'directus_refresh_token');
const cookieToken = useState('login_cookie_token', () => refreshCookie.value ?? null);

const checkLoginStatus = async () => {
  try {
    const response = await $isAuthenticated();
    console.log(response)
    if (response) {
      isLoggedIn.value = true;
      if (redirect) navigateTo(redirect);
      else navigateTo('/');
    }
    else {
      navigateTo('/admin_login');
    }
  } catch (error) {
    isLoggedIn.value = false;
    user.value = null;
  }
};

onMounted(async () => {
  // Priority 1: signed exchange token created by /api/auth/callback (most secure)
  const exchangeToken = route.query.k as string | undefined;

  // Priority 2: raw refresh token passed directly in URL (fallback / manual testing)
  const ssoToken = (route.query.token ?? route.query.refresh_token ?? cookieToken.value) as string | undefined;
  cookieToken.value = null;

  if (exchangeToken) {
    try {
      const tokens = await $fetch<{ access_token: string; refresh_token: string; expires: number }>(
        '/api/auth/exchange',
        { method: 'POST', body: { token: exchangeToken } },
      );
      $directusTokenStorage.set({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires: tokens.expires,
        expires_at: Date.now() + tokens.expires,
      });
    } catch (err) {
      console.error('Exchange token failed', err);
    }

    const cleanQuery = { ...route.query };
    delete cleanQuery.k;
    const qs = new URLSearchParams(cleanQuery as Record<string, string>).toString();
    history.replaceState({}, '', route.path + (qs ? `?${qs}` : ''));

  } else if (ssoToken) {
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
      // no existing session
    }
  }

  checkLoginStatus();
});

useSeoMeta({ title: 'Sign In', ogTitle: 'Sign In', robots: 'noindex' });
</script>
<template>
    <div>
      <div class="text-black w-full min-h-lvh flex items-center justify-center flex-col">
        <UProgress color="secondary" size="xl" :v-model="null" class="flex justify-center py-10 w-50"/>
      </div>
    </div>
</template>
