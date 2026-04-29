import { useAuthStore } from "~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {

    const siteDataStore = useSiteDataStore();
    const siteData = siteDataStore.getSiteData() as Site;
    let canPreview: Boolean | DirectusUser = false;
    if(siteData.preview) {
	    const { $isAuthenticatedWithPolicy } = useNuxtApp();
	    canPreview = await $isAuthenticatedWithPolicy('Administrator');
    }


    if ((siteData.preview && !canPreview) && to.path !== '/preview') {
        return navigateTo('/preview')
    }

});