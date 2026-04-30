import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
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
	routeRules: {
		// Never cache API routes - query params must always hit the server fresh
		'/api/**': { isr: false },   // API always fresh

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
		'@nuxtjs/i18n',
		'@nuxtjs/mdc',
		'@dargmuesli/nuxt-cookie-control',
		'@nuxtjs/turnstile'
	],
	scripts: {
		registry: {
			googleMaps: { trigger: 'onNuxtReady' },
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
					en: 'Preferaences' // you always have to specify a cookie name (in English)
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
			enableChatAgent: process.env.NUXT_PUBLIC_ENABLE_CHAT != 'false'
			
		},
		directusServerToken: process.env.DIRECTUS_SERVER_TOKEN,
		authExchangeSecret: process.env.AUTH_EXCHANGE_SECRET,
		anthropicApiKey: process.env.ANTHROPIC_API_KEY,
		voyageApiKey: process.env.VOYAGE_API_KEY,
		rebuildIndexSecret: process.env.REBUILD_INDEX_SECRET,
		duffelApiKey: process.env.DUFFEL_API_KEY,
		sessionTokenName: process.env.DIRECTUS_SESSION_TOKEN_NAME as string || 'directus_session_token',
		refreshTokenName: process.env.DIRECTUS_REFRESH_TOKEN_NAME as string || 'directus_refresh_token',
		scripts: {
			googleMaps: {
				apiKey: 'AIzaSyAyj3Ebj4qOEGVWx84gkuP7Nq6UQAQ5J78', // NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY
			},
		},
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
		enabled: process.env.NODE_ENV !== 'production' || !process.env.NUXT_PRERENDER_NODE_ENV ? false : true,
		headers: {
			contentSecurityPolicy: {
				'img-src': ["'self'", 'data:', '*'],
				'script-src': ["'self'", "'unsafe-inline'", '*'],
				'connect-src': ["'self'", process.env.DIRECTUS_URL  || ''],
				'frame-ancestors': ["'self'", process.env.DIRECTUS_URL || ''],
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
		{ name:'tw', code: 'zh_tw', language: 'zh_tW', file: 'tw.json'}
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
	},
	sitemap: {
		sources: ['/api/sitemap'],
	},

	hooks: {
		async 'prerender:routes'(ctx) {
		// Ensure we only do this during a production build
		if (process.env.NODE_ENV === 'development') return

		const directusUrl = process.env.DIRECTUS_URL || 'https://admin.congress.apoaonline.com'
		const token = process.env.DIRECTUS_SERVER_TOKEN // Use a static token if your collections are private

		try {
			console.log('Fetching dynamic routes for prerendering...')

			// 1. Fetch Pages and Posts in parallel via standard fetch
			// (This avoids issues with SDK initialization inside the config file)
			const [pagesRes, postsRes] = await Promise.all([
			fetch(`${directusUrl}/items/pages?fields=permalink&limit=-1`, {
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
