// Loads Google Analytics only once the "ga" cookie category (see
// nuxt.config.ts's cookieControl.cookies.optional) has actually been
// accepted in the cookie-control banner - registering it via
// scripts.registry in nuxt.config.ts would fire it unconditionally on
// every page load regardless of consent.
export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig();
	const { cookiesEnabledIds } = useCookieControl();

	let loaded = false;

	watch(
		cookiesEnabledIds,
		(ids) => {
			if (loaded || !ids?.includes('ga') || !config.public.googleAnalyticsId) return;
			loaded = true;
			useScriptGoogleAnalytics({ id: config.public.googleAnalyticsId as string });
		},
		{ immediate: true },
	);
});
