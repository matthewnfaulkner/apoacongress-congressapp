<script setup lang="ts">
import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

export interface SocialLink {
	service: string;
	url: string;
}

export interface NavigationItem {
	id: string;
	title: string;
	url?: string | null;
	page?: {
		permalink?: string | null;
	};
}

export interface FooterProps {
	navigation: {
		items: NavigationItem[];
	};
	site: {
		title?: string | null;
		logo?: DirectusFile | string | null;
		logo_dark_mode?: DirectusFile | string | null;
		description?: string | null;
		social_links?: SocialLink[];
	},
	organiser : {
		id: string;
		logo?: DirectusFile | string | null;
		name?: string | null;
		email?: string | null;
		address?: string | null;
		phone? : string | null;
		website?: string | null;
	}
}

const props = defineProps<FooterProps>();

// Using template ref to expose the footer to the layout for visual editing
const footerRef = useTemplateRef('footerRef');
defineExpose({ footerRef });

const lightLogoUrl = computed(() => getDirectusAssetURL(props.site.logo) || '/images/logo.svg');

const OrgLogoUrl = computed(() => getDirectusAssetURL(props.organiser.logo) || '/images/logo.svg');

const darkLogoUrl = computed(() => getDirectusAssetURL(props.site.logo_dark_mode));
</script>

<template>
	<UFooter v-if="site" ref="footerRef" class="bg-secondary py-16" :ui="{ center: 'justify-start'}">
		<template #left>
			
			<div class="flex-1 text-white px-4 pt-4">
					<NuxtLink to="/" class="inline-block transition-opacity hover:opacity-70">
						<img
							v-if="darkLogoUrl"
							:src="darkLogoUrl"
							alt="Logo"
							:class="['w-[300px] h-auto', darkLogoUrl ? 'dark:hidden' : '']"
						/>
						<img
							v-if="darkLogoUrl"
							:src="darkLogoUrl"
							alt="Logo (Dark Mode)"
							class="w-[120px] h-auto hidden dark:block"
						/>
					</NuxtLink>
					<p v-if="props.site.description" class="text-description mt-2">
						{{ props.site.description }}
					</p>

					<!-- Social Links -->
					<div v-if="props.site.social_links?.length" class="mt-4 flex space-x-4">
						<a
							v-for="social in props.site.social_links"
							:key="social.service"
							:href="social.url"
							target="_blank"
							rel="noopener noreferrer"
							class="size-8 rounded bg-transparent inline-flex items-center justify-center transition-colors hover:opacity-70"
						>
							<img
								:src="`/icons/social/${social.service}.svg`"
								:alt="`${social.service} icon`"
								class="size-6 dark:invert"
							/>
						</a>
					</div>
				</div>
		</template>
		<Container class="text-white m-0">
			<div class="flex flex-col md:flex-row items-start gap-8 pt-8">
				<div class="flex flex-col items-start flex-1">
					<nav v-if="props.navigation.items?.length" class="w-full md:w-auto text-left">
						<ul class="space-y-4 list-none list-inside">
							<li v-for="item in props.navigation.items" :key="item.id">
								<NuxtLink
									v-if="item.page?.permalink"
									:to="item.page.permalink"
									class="text-nav font-medium hover:underline"
								>
									{{ item.title }}
								</NuxtLink>
								<a v-else :href="item.url || '#'" class="text-nav font-medium hover:underline">
									{{ item.title }}
								</a>
							</li>
						</ul>
					</nav>
				</div>
			</div>
		</Container>
		<template #right> 
			<Container class="text-white" v-if="props.organiser">
				<div class="flex flex-col md:flex-row justify-between items-start gap-8 pt-8">
					<div class="flex flex-col items-start flex-1">
						<Tagline tagline="Conference Secretariat" class="text-white"> </Tagline>
						<NuxtLink :to="`/organisations/${props.organiser.id}`" class="inline-block transition-opacity hover:opacity-70">
							<img
								v-if="OrgLogoUrl"
								:src="OrgLogoUrl"
								:alt="props.organiser.name || 'logo'"
								:class="['w-[120px] h-auto']"
							/>
						</NuxtLink>
						<h3> {{ props.organiser.name }}</h3>
						<div v-if="props.organiser.address" class="mt-2"> <b>Address:</b> {{ props.organiser.address }}</div>
						<div v-if="props.organiser.phone" class="mt-2"> <b>Phone: </b>{{ props.organiser.phone }}</div>
						<div v-if="props.organiser.email" class="mt-2"> <b>Email: </b> {{ props.organiser.email }}</div>
					</div>
				</div>
			</Container>
		</template>
		<template #bottom>
			<p class="text-center text-sm text-white/70">
				&copy; {{ new Date().getFullYear() }} {{ props.site.title }}. All rights reserved.
			</p>
		</template>
	</UFooter>
</template>
