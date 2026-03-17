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
	],
	css: ['~/assets/css/main.css'],
	runtimeConfig: {
		public: {
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL as string,
			directusUrl: process.env.DIRECTUS_URL as string,
			enableVisualEditing: process.env.NUXT_PUBLIC_ENABLE_VISUAL_EDITING !== 'false',
			siteId: process.env.SITE_ID as string,
			loginUrl: process.env.LOGIN_URL as string,
			logoutUrl: process.env.LOGOUT_URL as string 
			
		},
		directusServerToken: process.env.DIRECTUS_SERVER_TOKEN,
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
