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
					class: 'lg:hidden xl:block rounded-none w-fit',
					src: lightLogoUrl,
					icon: 'i-lucide-image'
				}" 
				size="2xl" class="relative font-heading" 
				:name="props.site.title"/>
		</span>
      </NuxtLink>
    </template>

    <!-- UNavigationMenu with parsed items -->
	<template #right>
		<UNavigationMenu 
			:items="menuItems" 
			class="hidden lg:flex" 
			content-orientation="vertical"
			color="tertiary"
			highlight
			:ui="{
				link: ' text-md'
			}">
			<template v-slot:[`parent-content`]="{ item }">
				<div class="p-2">
				<div v-for="subMenuItem in item.children" :key="subMenuItem.label">
					<ULink v-if="!subMenuItem.children" :to="subMenuItem.to" class="p-2 block" active-class="text-secondary">
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
							class="justify-between p-2 text-accent hover:bg-gray-100 dark:hover:bg-gray-800"
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
			<UDropdownMenu
				v-if=" auth.isAuthenticated" 
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
						text: `${auth.isAuthenticated?.first_name[0] + auth.isAuthenticated?.last_name[0]}`,
						src: `${getDirectusAssetURL(auth.isAuthenticated.avatar)}`,
						size: 'xl'
					}"
					size="xl"
					color="accent"
					variant="outline"
					class="p-1"
				/>
			</UDropdownMenu>
			
			<UButton
				v-else
				:href="loginUrl" 
				label="Log In"
				color="accent"
				variant="outline"
				class="mx-3"/>

				
		</div>
		<NuxtLink v-for="locale in availableLocales" :key="locale.code" :to="switchLocalePath(locale.code)">
					{{ locale.name }}
				</NuxtLink>
	</template>

	<template #body>
		<div class="block">
			<UNavigationMenu 
			:items="menuItems" 
			class="hidden md:flex text-black block" 
			orientation="vertical"
			content-orientation="vertical"
			color="secondary"
			highlight
			:ui="{
				link: 'text-secondary',
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
import { useDirectusTranslation } from '@/composables/useDirectusTranslation';

const { $logout } = useNuxtApp();
const localePath = useLocalePath();

const auth = await useAuthStore();
const storeReady = ref(false)

const isLoggedIn = computed(() =>
  auth.isAuthenticated !== false
)

const { locale, locales } = useI18n();

const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => {
  return locales.value.filter(i => i.code !== locale.value)
})

// Props already defined
const props = defineProps<{
  navigation: { items: NavigationItem[] };
  site: { logo?: string; logo_dark_mode?: string, title?: string };
}>();


const runtimeConfig = useRuntimeConfig();
const loginUrl = runtimeConfig.public.loginUrl || '';
// Logo URLs
const lightLogoUrl = computed(() =>
  props.site?.logo ? `${runtimeConfig.public.directusUrl}/assets/${props.site.logo}` : '/images/logo.svg'
);

const siteTitle = computed(() => {
	return props.site.title;
})

interface parsedMenuItem {
	label: string;
	to: string | undefined,
	children: parsedMenuItem[]
}

// Recursive function to convert your navigation items into UNavigationMenu format
function parseMenu(items: NavigationItem[]) : parsedMenuItem[] {
  return items.map((item) => 
	{ 	
		const { translated } = useDirectusTranslation(item.translations);
		return {
			label: computed(() => translated.value?.title || item.title),
			to: computed(() => item.page?.permalink ? localePath(item.page?.permalink) : item.url || undefined),
			children: item.children?.length ? parseMenu(item?.children) : undefined,
			slot: item?.children?.length ? 'parent' : '',
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
    label: 'Log Out',
    icon: 'i-lucide-log-out',
	onSelect: () => $logout()
  },
])

</script>
