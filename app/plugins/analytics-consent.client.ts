// Loads Google Analytics only once the "ga" cookie category (see
// nuxt.config.ts's cookieControl.cookies.optional) has actually been
// accepted in the cookie-control banner - registering it via
// scripts.registry in nuxt.config.ts would fire it unconditionally on
// every page load regardless of consent.
export default defineNuxtPlugin(() => {
	const config = useRuntimeConfig();
	const { cookiesEnabledIds } = useCookieControl();
	const route = useRoute();

	let loaded = false;

	watch(
		cookiesEnabledIds,
		(ids) => {
			if (loaded || !ids?.includes('ga') || !config.public.googleAnalyticsId) return;
			// Decision links (pages/a/[token]/[option].vue) carry a working token
			// in the URL - GA's page_view would send it to Google. These pages are
			// only ever opened straight from an email (a full page load), so not
			// loading GA here keeps it off them entirely.
			if (route.path.startsWith('/a/')) return;
			loaded = true;
			useScriptGoogleAnalytics({ id: config.public.googleAnalyticsId as string });
		},
		{ immediate: true },
	);
});
