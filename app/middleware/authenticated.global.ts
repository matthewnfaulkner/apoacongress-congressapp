import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    const { $isAuthenticated, $directus } = useNuxtApp();


    const auth = useAuthStore();

    const authenticated = await $isAuthenticated().then((result) => {auth.setAuth(result)});
    
    //auth.setAuth(authenticated)
    console.log(from.fullPath, to.fullPath);
    if (!auth.isAuthenticated && auth.checked) {
         if (to.name.startsWith("login") || to.name.startsWith("admin_login")) {
            return;
        }
        console.log('here');
        return navigateTo("/login?redirect=" + to.fullPath)
    } else {
            // Login and register pages are not protected
        if (to.name.startsWith("login") || to.name.startsWith("admin_login")) {
            return ;
        }

        return;
    }

    return;
});
