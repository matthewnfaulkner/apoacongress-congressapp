<script setup lang="ts">
import type { Organisation, Site } from '#shared/types/schema';
import { OrganisationTypeDetails } from '#components';
const route = useRoute();
const id = (route.params.id as string[])[0];

const siteDataStore = useSiteDataStore();
const congressTitle = computed(() => (siteDataStore.siteData as Site).title ?? 'The congress');
const congressInfo = computed(() => siteDataStore.congressInfo);

const previousRoute = useState<string | null>('previousRoute');
const breadcrumbs = computed(() => {
	const crumbs = [{ label: 'Organisations', to: '/organisations' }];
	if (previousRoute.value && previousRoute.value !== route.fullPath) {
		crumbs.unshift({ label: 'Back', to: previousRoute.value });
	}
	return crumbs;
});

const { data, error } = await useFetch<Organisation>('/api/organisation/one', {
	key: `organisation-${id}`,
	headers: useRequestHeaders(['cookie']),
	query: { id },
});

if (!data.value || error.value) {
	throw createError({ statusCode: 404, statusMessage: 'Organisation not found', fatal: true });
}

const org = computed(() => data.value!);

const typeLabel: Record<string, string> = {
	apoa_sections: 'APOA Section',
	sponsor: 'Sponsor',
	noa: 'National Orthopaedic Association',
	ioa: 'International Orthopaedic Association',
	apoa_core: 'APOA'
};

type BadgeColor = 'primary' | 'warning' | 'success' | 'neutral';
const typeColor: Record<string, BadgeColor> = {
	apoa_sections: 'primary',
	sponsor: 'warning',
	noa: 'success',
};

const orgUrl = useRequestURL();
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim();
useSeoMeta({
	title: `${org.value.name ?? 'Organisation'} | ${congressInfo.value.title || congressTitle.value}`,
	description: org.value.description ? stripHtml(org.value.description) : `${org.value.name ?? 'Organisation'} involved with ${congressTitle.value}.`,
	ogTitle: `${org.value.name ?? 'Organisation'} | ${congressInfo.value.title || congressTitle.value}`,
	ogDescription: org.value.description ? stripHtml(org.value.description) : `${org.value.name ?? 'Organisation'} involved with ${congressTitle.value}.`,
	ogUrl: orgUrl.toString(),
});
</script>

<template>
	<div v-if="org">
		<Container class="py-12">
			<UBreadcrumb v-if="breadcrumbs.length" :items="breadcrumbs" class="mb-6" />

			<UPageCard orientation="horizontal" class="ring-0 mb-8" highlight-color="accent">
				<template #title>
					<p v-if="org.abbr" class="text-muted text-base font-normal mt-1">
						{{org.abbr}}
					</p>
					<div class="flex items-center gap-3 flex-wrap">
						<h1 class="font-heading text-3xl">{{ org.name }}</h1>
						<UBadge
							v-if="org.type"
							:label="typeLabel[org.type] ?? org.type"
							:color="typeColor[org.type] ?? 'neutral'"
							variant="subtle"
						/>
					</div>
					<div v-if="(org as any).partnership_type || (org as any).partnership_description" class="mt-3 space-y-1.5">
						<p v-if="(org as any).partnership_type" class="text-sm font-semibold text-accent uppercase tracking-wide">
							{{ (org as any).partnership_type }}
						</p>
						<p v-if="(org as any).partnership_description" class="text-sm text-muted" v-html="(org as any).partnership_description ">
						</p>
					</div>
				</template>

				<template #description>
					<div v-if="org.description" class="prose prose-sm max-w-none mt-2 mb-3" v-html="org.description" />
					<div class="space-y-1 text-sm text-muted mt-2">
						<p v-if="org.address" class="flex items-center gap-2">
							<UIcon name="i-lucide-map-pin" class="shrink-0" />
							{{ org.address }}
						</p>
						<p v-if="org.phone" class="flex items-center gap-2">
							<UIcon name="i-lucide-phone" class="shrink-0" />
							<a :href="`tel:${org.phone}`" class="hover:text-accent">{{ org.phone }}</a>
						</p>
						<p v-if="org.email" class="flex items-center gap-2">
							<UIcon name="i-lucide-mail" class="shrink-0" />
							<a :href="`mailto:${org.email}`" class="hover:text-accent">{{ org.email }}</a>
						</p>
						<p v-if="org.website" class="flex items-center gap-2">
							<UIcon name="i-lucide-globe" class="shrink-0" />
							<a :href="org.website" target="_blank" rel="noopener" class="hover:text-accent">{{ org.website }}</a>
						</p>
					</div>
				</template>

				<DirectusImage
					v-if="org.logo"
					:uuid="org.logo"
					:alt="org.name ?? ''"
					class="rounded-lg object-contain h-40 w-full max-w-xs"
					loading="lazy"
				/>
			</UPageCard>

			<OrganisationTypeDetails :organisation="org as any" />
		</Container>
	</div>
	<div v-else class="text-center text-xl mt-[20%]">404 - Organisation Not Found</div>
</template>
