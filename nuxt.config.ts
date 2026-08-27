import tailwindcss from "@tailwindcss/vite";

const isSandbox = process.env.NUXT_PUBLIC_IS_SANDBOX !== 'false';

export default defineNuxtConfig({
	extends: ['./layers/checkout'],
	components: [
		{ path: '~/components', pathPrefix: false },
		{ path: '~/components/block', pathPrefix: false },
		{ path: '~/components/shared', pathPrefix: false },
		{ path: '~/components/base', pathPrefix: false },
		{ path: '~/components/forms', pathPrefix: false },
	],
	colorMode: {
		preference: 'light', // Set to 'light' to disable system preference and force light mode
		fallback: 'light', // Optional: ensure fallback is also light
	},
	plugins: [
		'~/plugins/vue3-grid-layout-next.client.ts'
	],
	
	future: {
		compatibilityVersion: 4,
	},
	routeRules: isSandbox ? {
		'/api/**': { isr: false },
		// Ticket Tailor's API key is capped at 3000 calls per 30 minutes,
		// site-wide — this is per-IP defense against a single abusive
		// client/bot hammering these routes, not a guarantee of staying under
		// that aggregate cap under genuinely high distributed traffic (that's
		// what event.get.ts's own response caching protects instead).
		'/api/checkout/**': { security: { rateLimiter: { tokensPerInterval: 100, interval: 300000 } } },
		'/**': { isr: false },
	} : {
		// Never cache API routes - query params must always hit the server fresh
		'/api/**': { isr: false },
		'/api/checkout/**': { security: { rateLimiter: { tokensPerInterval: 100, interval: 300000 } } },

		// Auth pages must always run fresh SSR to read cookies
		'/login': { isr: false },
		'/admin_login': { isr: false },
		'/host/travel': { isr: false },

		// User-specific pages — nothing to gain from caching
		'/support/**': { isr: false },
		'/people/**': { isr: false },

		// Cache all page routes
		'/**': { isr: 60 },
	},
	ui: {
		colorMode: false,
		fonts: true,
		theme: {
		colors: [
			'primary',
			'secondary',
			'tertiary',
			'accent',
			'info',
			'success',
			'warning',
			'error'
		],
		}
	},
	modules: [
		'@nuxt/image',
		'@nuxtjs/seo',
		'@nuxt/scripts',
		'@vueuse/nuxt',
		'@nuxt/fonts',
		'nuxt-security',
		'shadcn-nuxt',
		'@nuxt/icon',
		'@nuxtjs/color-mode',
		'@nuxt/ui',
		'@primevue/nuxt-module',
		'@pinia/nuxt',
		'pinia-plugin-persistedstate/nuxt',
		'@nuxtjs/i18n',
		'@nuxtjs/mdc',
		'@dargmuesli/nuxt-cookie-control',
		'@nuxtjs/turnstile'
	],
	scripts: {
		registry: {
			googleAnalytics: [
				{ id: process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_ANALYTICS_ID },
				{ trigger: 'onNuxtReady' },
			]
		}
	},
	// Google Maps loaded as a plain head script (async/defer) rather than via
	// @nuxt/scripts' registry — that module's `onNuxtReady` trigger only
	// starts fetching the script after Nuxt's app has fully mounted, which is
	// later than PlacesAutocomplete.vue (see app/components/ui/
	// PlacesAutocomplete) needs it: vue-use-places-autocomplete does a single
	// unretried synchronous check for window.google.maps.places on mount, so
	// the script needs to already be loading well before that point. A head
	// script starts fetching during the initial HTML parse instead — same
	// approach the source project this was ported from uses.
	app: {
		head: {
			script: [
				{
					src: `https://maps.googleapis.com/maps/api/js?key=${process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY}&libraries=places`,
					async: true,
					defer: true,
				},
			],
		},
	},
	cookieControl: {
		barPosition: 'bottom-left',
		closeModalOnClickOutside: true,
		colors: {
			barBackground: 'var(--color-secondary)',
			modalBackground: 'var(--color-primary)',
			modalButtonBackground: 'var(--color-secondary)',
  			modalButtonColor: 'var(--color-primary)',
		},
		isControlButtonEnabled: false,
		isModalForced: false,
		// The cookies that are to be controlled.
		// See detailed explanation further down below!
		cookies: {
		necessary: [
			{
				description: {
					en: 'This cookie enables authentication.'
				},
				id: process.env.DIRECTUS_SESSION_TOKEN_NAME as string, // use a short cookie id to save bandwidth and prefixes to separate
				isPreselected: false, // `true` is not GDPR compliant! This flag does not enable any cookies, it only preselects the cookie's modal toggle. The default is `false`.
				name: {
					en: 'Directus Session Token' // you always have to specify a cookie name (in English)
				},
				links: {
					'https://example.com/privacy': 'Privacy Policy',
					'https://example.com/terms': 'Terms of Service',
				},
				src: 'https://example.com/preferences/js?id=<API-KEY>',
				targetCookieIds: [process.env.DIRECTUS_SESSION_TOKEN_NAME as string],
				}
		],
		optional: [
			{
				description: {
					en: 'This cookie stores preferences.'
				},
				id: 'pa', // use a short cookie id to save bandwidth and prefixes to separate
				isPreselected: false, // `true` is not GDPR compliant! This flag does not enable any cookies, it only preselects the cookie's modal toggle. The default is `false`.
				name: {
					en: 'Preferences' // you always have to specify a cookie name (in English)
				},
				links: {
					'https://example.com/privacy': 'Privacy Policy',
					'https://example.com/terms': 'Terms of Service',
				},
				src: 'https://example.com/preferences/js?id=<API-KEY>',
				targetCookieIds: ['xmpl_a', 'xmpl_b'],
				}
		],
		}

	},
	icon: {
		customCollections: [
			{ prefix: 'apoa', dir: './app/assets/images' }
		]
	},
	css: ['~/assets/css/main.css'],
	runtimeConfig: {
		public: {
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL as string,
			directusUrl: process.env.DIRECTUS_URL as string,
			enableVisualEditing: process.env.NUXT_PUBLIC_ENABLE_VISUAL_EDITING !== 'false',
			siteId: process.env.SITE_ID as string,
			loginUrl: process.env.LOGIN_URL as string,
			logoutUrl: process.env.LOGOUT_URL as string,
			isSandbox: process.env.NUXT_PUBLIC_IS_SANDBOX != 'false',
			cacheTtl: isSandbox ? 0 : 60,
			enableChatAgent: process.env.NUXT_PUBLIC_ENABLE_CHAT != 'false',
			refreshTokenName: process.env.DIRECTUS_REFRESH_TOKEN_NAME as string || 'directus_refresh_token',
			userAvatarFolder: process.env.NUXT_PUBLIC_USER_AVATAR_FOLDER as string,
			abstractFiguresFolder: process.env.NUXT_PUBLIC_ABSTRACT_FIGURES_FOLDER as string,
			requestAccessForm: process.env.NUXT_PUBLIC_REQUEST_ACCESS_FORM as string || '',
			samlProviderName: process.env.NUXT_PUBLIC_SAML_PROVIDER_NAME as string,
			checkoutNationalRedirectUrl: process.env.CHECKOUT_NATIONAL_REDIRECT_URL,
			googleMapsApiKey: process.env.NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY,
		},
		directusServerToken: process.env.DIRECTUS_SERVER_TOKEN,
		directusSupportUserToken: process.env.DIRECTUS_SUPPORT_USER_TOKEN,
		// Privileged token used by every checkout-layer API route that needs
		// elevated Directus access — either a genuine bot write (no logged-in
		// user to write as) or a read that would otherwise depend on the
		// Public role having the right field permissions (see
		// checkout-congress.ts, congress-ticket-enrichment.ts,
		// checkout-form.get.ts). Routes that check a specific customer's own
		// ownership/permissions (checkout-auth.ts, order.get.ts, my-orders.get.ts,
		// order/[id].get.ts) deliberately keep using that customer's own session
		// token instead — swapping those to this bot token would bypass the
		// per-user Directus permissions the ownership check actually relies on.
		directusOrderBotToken: process.env.DIRECTUS_ORDER_BOT_TOKEN,
		authExchangeSecret: process.env.AUTH_EXCHANGE_SECRET,
		anthropicApiKey: process.env.ANTHROPIC_API_KEY,
		voyageApiKey: process.env.VOYAGE_API_KEY,
		rebuildIndexSecret: process.env.REBUILD_INDEX_SECRET,
		dataRequestFlowId: process.env.DIRECTUS_DATA_REQUEST_FLOW_ID,
		// Capability-scoped Ticket Tailor keys — each server call uses the
		// narrowest one that covers what it actually does, rather than one
		// all-access key everywhere.
		ticketTailorEventReadKey: process.env.TICKET_TAILOR_EVENT_READ_KEY,
		ticketTailorOrderReadKey: process.env.TICKET_TAILOR_ORDER_READ_API_KEY,
		ticketTailorBundleCreateKey: process.env.TICKET_TAILOR_BUNDLE_CREATOR_API_KEY,
		// The event id itself now comes from Directus (congress.tt_event_id via
		// getCongressEventId), not an env var — see checkout-locality.ts.
		sessionTokenName: process.env.DIRECTUS_SESSION_TOKEN_NAME as string || 'directus_session_token',
		refreshTokenName: process.env.DIRECTUS_REFRESH_TOKEN_NAME as string || 'directus_refresh_token',
	},
	shadcn: {
		/**
		 * Prefix for all the imported component
		 */
		prefix: '',
		/**
		 * Directory that the component lives in.
		 * @default "./components/ui"
		 */
		componentDir: './app/components/ui',
	},

	security: {
		// Previously also required NUXT_PRERENDER_NODE_ENV to be set, which
		// nothing in the real deploy actually sets — confirmed empirically
		// (curl -I against production showed no CSP/rate-limiter headers at
		// all) that this left security fully disabled in production.
		enabled: process.env.NODE_ENV === 'production',
		// nuxt-security 2.5.0's SSG plugin crashed prerendering on this
		// project's Nitro version ("element.matchAll is not a function" —
		// its render:html hook expected html[section] entries to be plain
		// strings, which didn't hold here). Fixed upstream in 2.6.0 (moved to
		// render:response, operating on the final response body with a
		// typeof guard) — package.json bumped accordingly, so ssg stays on
		// its module defaults (meta/nitroHeaders/hashScripts etc.), which
		// matters on Vercel specifically: prerendered pages are served
		// straight from its CDN, bypassing the serverless function, so this
		// is the only way those routes get CSP/security headers at all.
		headers: {
			// nuxt-security defaults this to 'credentialless' in production
			// (only 'unsafe-none' in dev — which is why this broke on build but
			// not in dev). credentialless strips cookies from cross-origin
			// iframes that don't explicitly opt in, and Ticket Tailor's checkout
			// widget (see CheckoutEmbed.vue) depends entirely on its own
			// TT_SessionID cookie to function — confirmed empirically ("refused
			// to connect" only in production builds, and the same URL works
			// fine loaded standalone, just not framed). We deliberately embed
			// cookie-dependent third-party content here and don't need COEP's
			// cross-origin isolation guarantees (e.g. for SharedArrayBuffer),
			// so it's turned off entirely instead.
			crossOriginEmbedderPolicy: 'unsafe-none',
			contentSecurityPolicy: {
				'img-src': ["'self'", 'data:', '*'],
				'script-src': ["'self'", "'unsafe-inline'", '*'],
				// maps.googleapis.com/maps.gstatic.com: the Google Maps JS API (see
				// app.head.script) makes its own network calls, including a CSP
				// self-test ping, independent of the script tag's own src (already
				// covered by script-src's wildcard).
				// tickets.apoaonline.com: the box office's custom domain — Ticket
				// Tailor's own checkout_url (and therefore the embedded widget's
				// data-url) now resolves here instead of *.tickettailor.com, so both
				// need to stay allowlisted rather than swapping one for the other.
				'connect-src': ["'self'", process.env.DIRECTUS_URL  || '', 'https://api.tickettailor.com', 'https://*.tickettailor.com', 'https://tickets.apoaonline.com', 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
				'frame-ancestors': ["'self'", process.env.DIRECTUS_URL || ''],
				// Allows the checkout layer to embed Ticket Tailor's hosted checkout widget.
				'frame-src': ["'self'", 'https://*.tickettailor.com', 'https://tickets.apoaonline.com'],
			},
		},
	},

	devtools: { enabled: true },

	// Image Configuration - https://image.nuxt.com/providers/directus
	image: {
		providers: {
			directus: {
				provider: 'directus',
				options: {
					baseURL: `${process.env.DIRECTUS_URL}/assets/`,
				},
			},
			local: {
				provider: 'ipx',
			},
		},
	},
	i18n: {
		strategy: 'prefix_except_default',
		locales: [
		{ name:'en', code: 'en', language: 'en-US', file: 'en.json'},
		//{ name:'tw', code: 'zh_tw', language: 'zh_tW', file: 'tw.json'}
		],
		defaultLocale: 'en',
	},
	site: {
		url: process.env.NUXT_PUBLIC_SITE_URL as string,
	},
	vue: {
		propsDestructure: true,
	},
	vite: {
		plugins: [
		tailwindcss(),
		],
		server: {
			allowedHosts: ['matthews-macbook-pro.tailb81239.ts.net']
		}
	},
	sitemap: {
		sources: ['/api/sitemap'],
	},

	hooks: {
		async 'prerender:routes'(ctx) {
		// Ensure we only do this during a production build
		if (process.env.NODE_ENV === 'development') return
		if (isSandbox) return	
		const directusUrl = process.env.DIRECTUS_URL || 'https://admin.congress.apoaonline.com'
		const token = process.env.DIRECTUS_SERVER_TOKEN // Use a static token if your collections are private

		try {
			console.log('Fetching dynamic routes for prerendering...')

			// 1. Fetch Pages and Posts in parallel via standard fetch
			// (This avoids issues with SDK initialization inside the config file)
			const [pagesRes, postsRes] = await Promise.all([
			fetch(`${directusUrl}/items/pages?filter[status][_eq]=published&fields=permalink&limit=-1`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {}
			}),
			fetch(`${directusUrl}/items/posts?filter[status][_eq]=published&fields=slug&limit=-1`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {}
			})
			])

			const pages = await pagesRes.json()
			const posts = await postsRes.json()

			// 2. Format and add Pages
			pages.data?.forEach((page: any) => {
			const path = page.permalink.startsWith('/') ? page.permalink : `/${page.permalink}`
			ctx.routes.add(path)
			})

			// 3. Format and add Posts
			posts.data?.forEach((post: any) => {
			ctx.routes.add(`/blog/${post.slug}`)
			})

			console.log(`Successfully added ${ctx.routes.size} routes to prerender.`)
		} catch (error) {
			console.error('Prerender hook failed:', error)
		}
		}
	},
	nitro: {
		prerender: {
			// This is the most important part:
      		crawlLinks: false,
			/*crawlLinks: true,
			routes: ['/', '/sitemap_index.xml'],*/
			failOnError: false,
		}
	},

	compatibilityDate: '2025-01-16',
});
