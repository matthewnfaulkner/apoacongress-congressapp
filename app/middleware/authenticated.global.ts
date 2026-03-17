import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip this entirely during the prerender/build phase
    if (import.meta.prerender) return;
    
    const { $isAuthenticated, $directus } = useNuxtApp();


    const auth = useAuthStore();

    await $isAuthenticated().then((result) => {auth.setAuth(result)});
    
});
