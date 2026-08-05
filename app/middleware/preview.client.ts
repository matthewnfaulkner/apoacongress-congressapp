export default defineNuxtRouteMiddleware(async (to) => {

    const siteDataStore = useSiteDataStore();
    const siteData = siteDataStore.getSiteData() as Site;
    let canPreview: false | Record<string, any> = false;

    return;
    if(siteData.preview && to.path !== '/preview') {
	    const { $isAuthenticatedWithPolicy } = useNuxtApp();
	    canPreview = await $isAuthenticatedWithPolicy('Administrator');
    }

    
    if ((siteData.preview && !canPreview) && to.path !== '/preview') {
        return navigateTo('/preview')
    }

});