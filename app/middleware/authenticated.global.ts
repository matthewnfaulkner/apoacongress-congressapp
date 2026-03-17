import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip this entirely during the prerender/build phase
    console.log('Client Middleware');

    if (import.meta.prerender || process.env.NODE_ENV === 'production') return;

    const { $isAuthenticated, $directus } = useNuxtApp();


    const auth = useAuthStore();

    await $isAuthenticated().then((result) => {auth.setAuth(result)});
    
});
