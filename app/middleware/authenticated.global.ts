import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip this entirely during the prerender/build phase
    if (import.meta.prerender) return;
    
    const { $isAuthenticated, $isAuthenticatedWithPolicy } = useNuxtApp();

    const auth = useAuthStore();

    await $isAuthenticated().then((result) => {auth.setAuth(result as AuthResult)});

    const config = useRuntimeConfig();
    if(config.public.isSandbox) {
        const result = await $isAuthenticatedWithPolicy('Abstracts - Reviewer');
        auth.setAuth(result);
        
        if (!result && auth.checked) {
            if (to.name?.startsWith("forgotten_password") || to.name?.startsWith("reset_password")  || to.name?.startsWith("admin_login")) return;
                return navigateTo("/admin_login");
        }
        else if (result && auth.checked) {
            if (to.name?.startsWith("admin_login")) {
                return navigateTo('/')
            }
        }
    } 
});
``