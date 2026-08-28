<template>
  <UHeader
  	:ui="{
		root: 'border-accent',
		container: 'px-4 lg:px-0'
	}">
    <template #title>
      <NuxtLink to="/">
		<span>
			<UUser 
				:avatar="{
					class: 'lg:hidden xl:block rounded-none max-w-25',
					src: lightLogoUrl,
					icon: 'i-lucide-image',
					ui: {
						root: 'w-fit bg-transparent'
					}
				}" 
				size="2xl" class="relative font-heading" 
			/>
		</span>
      </NuxtLink>
    </template>

    <!-- UNavigationMenu with parsed items -->
	<template #right>

		<UNavigationMenu 
			:items="menuItems" 
			class="hidden lg:flex" 
			content-orientation="vertical"
			color="accent"
			highlight
			:ui="{
				link: ' text-md'
			}">
			<template v-slot:[`parent-content`]="{ item }">
				<div class="p-2">
					<div v-for="subMenuItem in item.children" :key="subMenuItem.label">

						<ULink v-if="!subMenuItem.children" :active="subMenuItem.active" :to="subMenuItem.to" class="p-2 block" active-class="text-accent">
							{{ subMenuItem.label }}
						</ULink>
						<!-- EXPANDING SUB-MENU (With children) -->
						<UCollapsible v-else>
								<!-- The Trigger -->
								<UButton
								:label="subMenuItem.label"
								variant="ghost"
								color="neutral"
								trailing-icon="i-lucide-chevron-down"
								block
								class="justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-md text-muted"
								/>

								<!-- The Expanding Content -->
								<template #content>
								<div class="ml-4 border-l font-normal border-gray-200 dark:border-gray-800 pl-2 flex flex-col gap-1 mt-1">
									<ULink 
									v-for="child in subMenuItem.children" 
									:key="child.label"
									:to="child.to"
									class="px-3 py-1.5 text-sm rounded-md hover:text-gray-900 transition-colors"
									active-class="text-accent"
									>
									{{ child.label }}
									</ULink>
								</div>
								</template>
							</UCollapsible>
					</div>
				</div>
			</template>
		</UNavigationMenu>
		<div v-if="storeReady">
			<ClientOnly>
				<UDropdownMenu
					v-if="auth.isAuthenticated" 
					:items="items"
					:content="{
						side: 'bottom',
					}"
					:ui="{
						content: 'w-48',
						item: 'cursor-pointer'
					}"
				>
					<UButton
						v-if=" auth.isAuthenticated" 
						:avatar="{
							text: `${authUser?.first_name?.[0] ?? ''}${authUser?.last_name?.[0] ?? ''}`,
							src: getDirectusAssetURL(authUser?.avatar) || '',
							size: 'xl',
							ui: {fallback: 'overflow-visible'}
						}"
						size="xl"
						color="accent"
						variant="outline"
						class="p-1 w-12 h-12"
					/>
				</UDropdownMenu>
			
			<UButton
				v-else
				:to="loginUrl" 
				target="_self"
				label="Log In"
				color="accent"
				variant="outline"
				class="mx-3"/>

				
			</ClientOnly>
				
		</div>
		<div v-else>
			<USkeleton class="h-12 w-12 rounded-1 w-12" />
		</div>
		<!--<NuxtLink v-for="locale in availableLocales" :key="locale.code" :to="switchLocalePath(locale.code)">
					{{ locale.name }}
				</NuxtLink>-->
	</template>

	<template #body>
		<div class="block">
			
			<UNavigationMenu 
			:items="menuItems" 
			class="hidden md:flex text-black block text-2xl" 
			orientation="vertical"
			content-orientation="vertical"
			color="secondary"
			highlight
			:ui="{
				link: 'text-secondary text-xl',
			}"/>
			</div>

	</template>

  </UHeader>
</template>
<script setup lang="ts">

import { computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';
import type { DropdownMenuItem } from '@nuxt/ui';
import { withLeadingSlash, withoutTrailingSlash } from 'ufo';
const active = ref();

const { $logout } = useNuxtApp();
const localePath = useLocalePath();
const route  = useRoute();
const path = computed(() => withoutTrailingSlash(withLeadingSlash(route.path)));
const auth = await useAuthStore();
const storeReady = ref(false)

const isLoggedIn = computed(() =>
  auth.isAuthenticated !== false
)

const authUser = computed(() =>
  typeof auth.isAuthenticated === 'object' ? auth.isAuthenticated : null
)

const { locale, locales } = useI18n();

const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => {
  return locales.value.filter(i => i.code !== locale.value)
})

// Props already defined
const props = defineProps<{
  navigation: { items: NavigationItem[] };
  site: { logo?: DirectusFile | string | null; logo_dark_mode?: DirectusFile | string | null, title?: string };
}>();


const runtimeConfig = useRuntimeConfig();

const loginUrl = computed(() => runtimeConfig.public.loginUrl + `?redirect=${path.value}` || '');
// Logo URLs
const lightLogoUrl = computed(() => getDirectusAssetURL(props.site?.logo) || '/images/logo.svg');

const siteTitle = computed(() => {
	return props.site.title;
})

interface parsedMenuItem {
	label: string;
	to: string | undefined,
	children: parsedMenuItem[]
	active: boolean;
}

// An item counts as "active" if its own link matches the current route, or —
// recursively — if any of its children's links do. Without this, a parent
// trigger with children never highlights while you're on one of its submenu
// pages, since UNavigationMenu's own active-detection only checks an item's
// own `to`.
function itemMatchesPath(item: NavigationItem, currentPath: string): boolean {
	const page = typeof item.page === 'object' ? item.page : null
	const itemPath = page?.permalink ? localePath(page.permalink) : item.url
	if (itemPath && withoutTrailingSlash(withLeadingSlash(itemPath)) === currentPath) return true
	const children = Array.isArray(item.children) ? item.children : []
	return children.some((child) => typeof child === 'object' && itemMatchesPath(child, currentPath))
}

// Recursive function to convert your navigation items into UNavigationMenu format
function parseMenu(items: NavigationItem[]) : parsedMenuItem[] {
  return items.map((item) =>
	{
		//const { translated } = useDirectusTranslation(item.translations);
		const page = typeof item.page === 'object' ? item.page : null
		const children = Array.isArray(item.children) ? item.children.filter((child): child is NavigationItem => typeof child === 'object') : []
		return {
			label: computed(() => item.title),
			to: computed(() => page?.permalink ? localePath(page.permalink) : item.url || undefined),
			children: children.length ? parseMenu(children) : undefined,
			slot: children.length ? 'parent' : '',
			active: itemMatchesPath(item, path.value),
		}
	});
}

// Computed menu for UNavigationMenu
const menuItems = computed(() => parseMenu(props.navigation.items));

onMounted(async () => {
  // if your store has a fetch method, call it here
  storeReady.value = true
})


const items = ref<DropdownMenuItem[]>([
  {
    label: 'Profile',
    icon: 'i-lucide-user',
	to: '/profile'
  },
  {
    label: 'My Orders',
    icon: 'i-lucide-receipt',
	to: '/checkout/my-orders'
  },
  {
    label: 'Support Tickets',
    icon: 'i-lucide-message-circle-question-mark',
	to: '/support/mytickets'
  },
  {
    label: 'Log Out',
    icon: 'i-lucide-log-out',
	onSelect: () => $logout()
  },
])

</script>
