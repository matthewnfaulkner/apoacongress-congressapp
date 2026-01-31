<script setup lang="ts">

interface PeopleSpeakerProps {
	data: {
		roles: Array<{
			roles_id: {
				persons: Array<{
					persons_id: {
						first_name: string,
						last_name: string,
						title: string,
						country: {
							countryCodes: string[],
							locale: string
						}
						image: DirectusFile | string,
						bio?: string | null,
					}
				}>
			}
		}>
	};
}

const { setAttr } = useVisualEditing();
const props = defineProps<PeopleSpeakerProps>();

import { computed } from 'vue'

const uniquePersons = computed(() => {
  const seen = new Map<number, any>()

  for (const role of props.data.roles) {
    for (const person of role.roles_id.persons) {
        const id = person.persons_id.id
        if (!seen.has(id)) {
          seen.set(id, person)
        }
      
    }
  }

  return Array.from(seen.values())
})

</script>

<template>
	<UPageSection :ui="{
		container: 'gap-0 sm:gap-0 lg:gap-0 lg:py-0'
	}">
		<div v-if="data.roles">
			<UPageGrid>
				<UPageCard
					v-for="person in uniquePersons"
					:key="person.persons_id.id"
					highlight-color="accent"
					orientation="vertical"
					class="text-center h-full justify-center ring-0"
					:ui="{
						wrapper: 'items-center'
					}"
				>
					<template #header>
						<Tagline
							class="text-xs w-full"
							:tagline="person.persons_id.title"
						/>
						<Text
							class="text-xl font-heading"
							:content="person.persons_id.first_name"
						/>
						<CountryName
							:country-codes="person.persons_id.country.countryCodes"
							:locale="person.persons_id.country.locale"
						/>
					</template>

					<template #body>
						<DirectusImage
							class="h-50"
							:uuid="person.persons_id.image"
						/>
					</template>
				</UPageCard>
			</UPageGrid>

		</div>
	</UPageSection>

</template>
