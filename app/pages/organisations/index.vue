<script setup lang="ts">
import type { Organisation } from '#shared/types/schema';

const { data, error } = await useFetch<Organisation[]>('/api/organisation', {
	key: 'organisations',
	query: {
		exclude: 'sponsors'
	}
});

if (error.value) {
	throw createError({ statusCode: 500, statusMessage: 'Failed to load organisations', fatal: true });
}

const organisations = computed(() => data.value ?? []);

type OrgType = 'apoa_sections' | 'sponsors' | 'noa' | 'ioa' | 'apoa_core';

type BadgeColor = 'primary' | 'warning' | 'success' | 'neutral';

const typeConfig: Record<OrgType, { label: string; color: BadgeColor; icon: string }> = {
	apoa_core: { label: 'APOA', color: 'success', icon: 'i-lucide-bolt' },
	noa: { label: 'National Orthopaedic Associations', color: 'success', icon: 'i-lucide-flag' },
	ioa: { label: 'International Orthopaedic Associations', color: 'success', icon: 'i-lucide-earth' },
	sponsors: { label: 'Sponsors', color: 'warning', icon: 'i-lucide-sparkle' },
	apoa_sections: { label: 'APOA Sections', color: 'primary', icon: 'i-lucide-chart-pie' },
	

};

const typeOrder: OrgType[] = ['apoa_core', 'noa' , 'ioa', 'sponsors', 'apoa_sections'];

const grouped = computed(() => {
	const map: Record<string, Organisation[]> = {};
	for (const org of organisations.value) {
		const key = org.type ?? 'other';
		if (!map[key]) map[key] = [];
		map[key].push(org);
	}
	return typeOrder
		.filter((t) => map[t]?.length)
		.map((t) => ({ type: t, config: typeConfig[t], orgs: map[t] }));
});

const pageUrl = useRequestURL();
useSeoMeta({
	title: 'Organisations',
	description: 'Organisations involved with APOA 2027 Taiwan.',
	ogTitle: 'Organisations',
	ogDescription: 'Organisations involved with APOA 2027 Taiwan.',
	ogUrl: pageUrl.toString(),
});
</script>

<template>
	<Container class="py-12">
		<Headline class="font-heading text-4xl mb-10" headline="Congress Organisations"/>
		<div v-if="!organisations.length" class="text-muted text-center py-20">
			No organisations found.
		</div>

		<div v-else class="space-y-12">
			<section v-for="group in grouped" :key="group.type">
				<div class="flex items-center gap-3 mb-6">
					<UIcon :name="group.config.icon" class="text-2xl" />
					<h2 class="font-sans text-2xl">{{ group.config.label }}</h2>
				</div>

				<UPageGrid class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<UPageCard
						v-for="org in group.orgs"
						:key="org.id"
						:to="`/organisations/${org.id}`"
						highlight-color="accent"
						orientation="vertical"
						class="ring-0 cursor-pointer hover:ring-1 hover:ring-accent transition-shadow"
					>
						<template #header>
							
							<DirectusImage
								v-if="org.logo"
								:uuid="typeof org.logo === 'string' ? org.logo : (org.logo as any).id"
								:alt="org.name ?? ''"
								class="h-16 object-contain mx-auto"
								loading="lazy"
							/>
							<div v-else class="h-16 flex items-center justify-center">
								<UIcon :name="group.config.icon" class="text-4xl text-muted" />
							</div>
						</template>

						<template #title>
							<span class="font-sans text-base">{{ org.name }}</span>
						</template>

						<template #description>
							<div class="flex items-center justify-between mt-1">
								<p v-if="org.short_name || org.abbr" class="text-muted text-xs">
									{{ [org.short_name, org.abbr].filter(Boolean).join(' · ') }}
								</p>
								<UBadge
									:label="group.config.label"
									:color="group.config.color"
									variant="subtle"
									size="xs"
									class="ml-auto"
								/>
							</div>
							<div v-if="org.description" class="prose prose-sm max-w-none text-muted mt-2 line-clamp-2" v-html="org.description" />
						</template>
					</UPageCard>
				</UPageGrid>
			</section>
		</div>
	</Container>
</template>
