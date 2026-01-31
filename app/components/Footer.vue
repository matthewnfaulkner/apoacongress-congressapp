<script setup lang="ts">
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
		logo?: string | null;
		logo_dark_mode?: string | null;
		description?: string | null;
		social_links?: SocialLink[];
	},
	organiser : {
		logo?: string | null;
		name?: string | null;
		email?: string | null;
		address?: string | null;
		phone? : string | null;
		website?: string | null;
	}
}

const props = defineProps<FooterProps>();
const runtimeConfig = useRuntimeConfig();

// Using template ref to expose the footer to the layout for visual editing
const footerRef = useTemplateRef('footerRef');
defineExpose({ footerRef });

const lightLogoUrl = computed(() =>
	props.site.logo ? `${runtimeConfig.public.directusUrl}/assets/${props.site.logo}` : '/images/logo.svg',
);

const OrgLogoUrl = computed(() =>
	props.organiser.logo ? `${runtimeConfig.public.directusUrl}/assets/${props.organiser.logo}` : '/images/logo.svg',
);

const darkLogoUrl = computed(() =>
	props.site.logo_dark_mode ? `${runtimeConfig.public.directusUrl}/assets/${props.site.logo_dark_mode}` : '',
);
</script>

<template>
	<UFooter v-if="site" ref="footerRef" class="bg-secondary py-16">
		<template #left>
			<div class="flex-1 text-white">
					<NuxtLink to="/" class="inline-block transition-opacity hover:opacity-70">
						<img
							v-if="lightLogoUrl"
							:src="lightLogoUrl"
							alt="Logo"
							:class="['w-[120px] h-auto', darkLogoUrl ? 'dark:hidden' : '']"
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
		<Container class="text-white">
			<div class="flex flex-col md:flex-row items-start gap-8 pt-8">
				<div class="flex flex-col items-start flex-1">
					<nav v-if="props.navigation.items?.length" class="w-full md:w-auto text-left">
						<ul class="space-y-4 list-disc">
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
			<Container class="text-white">
				<div class="flex flex-col md:flex-row justify-between items-start gap-8 pt-8">
					<div class="flex flex-col items-start flex-1">
						<Tagline tagline="Conference Scretariat" class="text-white"> </Tagline>
						<NuxtLink :to="props.organiser.website || ''" class="inline-block transition-opacity hover:opacity-70">
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
	</UFooter>
</template>
