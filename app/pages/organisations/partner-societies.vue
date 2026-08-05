<script setup lang="ts">
import type { Organisation } from '#shared/types/schema';

const { data, error } = await useFetch<Organisation[]>('/api/organisation', {
	key: 'partner-societies',
	headers: useRequestHeaders(['cookie']),
	query: {
		exclude: 'apoa_core,sponsors'
	}
});

if (error.value) {
	throw createError({ statusCode: 500, statusMessage: 'Failed to load partner societies', fatal: true });
}

const typeOrder = ['apoa_core', 'noa', 'ioa', 'sponsors', 'apoa_sections'];

const organisations = computed(() => {
	const orgs = data.value ?? [];
	return [...orgs].sort((a, b) => {
		const ai = typeOrder.indexOf(a.type ?? '');
		const bi = typeOrder.indexOf(b.type ?? '');
		return (ai === -1 ? typeOrder.length : ai) - (bi === -1 ? typeOrder.length : bi);
	});
});

const pageUrl = useRequestURL();
useSeoMeta({
	title: 'Partner Societies',
	description: 'Partner Societies involved with APOA 2027 Taiwan.',
	ogTitle: 'Partner Societies',
	ogDescription: 'Partner Societies involved with APOA 2027 Taiwan.',
	ogUrl: pageUrl.toString(),
});
</script>

<template>
	<Container class="py-12">
		<Headline class="font-heading text-4xl mb-10" headline="Partner Societies"/>
		<div v-if="!organisations.length" class="text-muted text-center py-20">
			No Partner Societies found.
		</div>

		<UPageGrid v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			<UPageCard
				v-for="org in organisations"
				:key="org.id"
				:to="`/organisations/${org.id}`"
				highlight-color="accent"
				orientation="vertical"
				class="ring-1 cursor-pointer hover:ring-1 hover:ring-accent transition-shadow"
				:ui="{
					header: 'w-full',
					body: 'text-center w-full'
				}"
			>
				<template #header>
					<DirectusImage
						v-if="org.logo"
						:uuid="org.logo"
						:alt="org.name ?? ''"
						class="h-24 object-contain mx-auto block"
						loading="lazy"
					/>
					<div v-else class="h-24 flex items-center justify-center">
						<UIcon name="i-lucide-building-2" class="text-5xl text-muted" />
					</div>
				</template>

				<template #title>
					<p v-if="(org as any).partnership_type" class="text-xs uppercase tracking-wide mb-1 text-accent">{{ (org as any).partnership_type }}</p>
					<span class="font-sans text-base text-center">{{ org.name }}</span>
				</template>

			</UPageCard>
		</UPageGrid>
	</Container>
</template>
