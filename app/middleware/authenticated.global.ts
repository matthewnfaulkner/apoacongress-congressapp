import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip this entirely during the prerender/build phase
    if (import.meta.prerender) return;


    const { $isAuthenticated, $isAuthenticatedWithPolicy } = useNuxtApp();

    const auth = useAuthStore();

    await $isAuthenticated().then((result) => {auth.setAuth(result as AuthResult)});
    
    const config = useRuntimeConfig();

    if(config.public.isSandbox) {
        if (import.meta.server) return;
        const result = await $isAuthenticatedWithPolicy('Sandbox - Access');
        
        if (!result && auth.checked) {
            if (to.name?.startsWith("forgotten_password") || to.name?.startsWith("reset_password")  || to.name?.startsWith("admin_login") || to.name?.startsWith("no-access")|| to.name?.startsWith("logout") ) return;
                return navigateTo("/no-access");
        }
        else if (result && auth.checked) {
            if (to.name?.startsWith("admin_login")) {
                return navigateTo('/')
            }
        }
    } 
});
``