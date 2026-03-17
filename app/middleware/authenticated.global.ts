import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {

    const { $isAuthenticated, $directus } = useNuxtApp();


    const auth = useAuthStore();

    await $isAuthenticated().then((result) => {auth.setAuth(result)});
    
});
