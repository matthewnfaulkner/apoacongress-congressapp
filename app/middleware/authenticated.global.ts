import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    const { $isAuthenticated, $directus } = useNuxtApp();


    const auth = useAuthStore();

    const authenticated = await $isAuthenticated().then((result) => {auth.setAuth(result)});
    
    //auth.setAuth(authenticated)
    if (!auth.isAuthenticated && auth.checked) {
         if (to.name.startsWith("login") || to.name.startsWith("admin_login")) {
            return;
        }
        return navigateTo("/login?redirect=" + to.fullPath)
    } else {
            // Login and register pages are not protected
        if (to.name.startsWith("login") || to.name.startsWith("admin_login")) {
            return ;
        }

        return;
    }

});
