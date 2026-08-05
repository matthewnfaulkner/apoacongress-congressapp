import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Skip this entirely during the prerender/build phase
    if (import.meta.prerender) return;


    const { $isAuthenticated, $isAuthenticatedWithPolicy, $directusTokenStorage } = useNuxtApp();

    const auth = useAuthStore();

    const config = useRuntimeConfig();

    const canTrustCachedAuth = () => {
        if (config.public.isSandbox) return false;   // sandbox still needs live policy check
        if (!import.meta.client || !auth.checked) return false; // SSR/first load always revalidates

        const token = $directusTokenStorage.get();
        const accessToken = token?.access_token ?? null;

        if (accessToken !== auth.lastToken) return false; // token appeared/disappeared/changed — revalidate
        if (!accessToken) return true; // still logged out, nothing changed since last check

        return !!token.expires_at && token.expires_at > Date.now();
    };

    if (!canTrustCachedAuth()) {
        const token = $directusTokenStorage.get();
        await $isAuthenticated().then((result) => {auth.setAuth(result as AuthResult, token?.access_token ?? null)});
    }

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