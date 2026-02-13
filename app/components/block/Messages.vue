<script setup lang="ts">
import type { DirectusFile } from '@directus/sdk';
import  ButtonGroup  from '@/components/base/ButtonGroup.vue';

interface MessagesProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
		messages: [{
			id: string,
			people: [{
				extra: string
				person: {
					id: string,
					first_name: string,
					last_name: string,
					image: DirectusFile	
				}
				
			}],
			tagline: string,
			content: string,
			button_group?: {
				buttons: Array<{
					id: string;
					label: string | null;
					variant: string | null;
					url: string | null;
					type: 'url' | 'page' | 'post';
					pagePermalink?: string | null;
					postSlug?: string | null;
				}>;
			};
		}]
	};
}


const { setAttr } = useVisualEditing();
const props = defineProps<MessagesProps>();


</script>


<template>
	<Headline :headline="data.headline" />
	<UCarousel 
		v-if="data.messages"
		class="max-w-screen" 
		:autoplay="{ delay: 2000 }"
		:overlay="false"
		:items="data.messages"
		v-slot="{ item }"
		:ui="{
			root: 'group relative flex items-center overflow-hidden gap-0',
			item: 'md:basis-1/2 min-h-fit',
			container: 'pb-10'
		}">
			<UPageCard
					:key="item.id"
					class="text-center ring-0 flex flex-row"
					:ui="{
						container: 'gap-y-0 p-10 shadow-xl h-inherit',
						wrapper: 'mx-auto border-accent ',
						body: 'p-5 ',
						footer: 'w-full'
					}"
				>
				<template #header class="mx-auto">
					<Tagline :tagline="item.tagline"/>
				</template>	
				<template #body>
					<div v-html="item.content" class="text-left h-60">

					</div>
					<div class="flex flex-row justify-around">
						<div v-for="person in item.people" >
							<ProfileImage class="h-40 mx-auto" :image="person.person.image":ui="{ item: 'basis-1/2' }" />
							<p class="font-heading">
							{{ person.person.first_name }} {{ person.person.last_name }}
							</p>
							<p>{{ person.extra }}</p>
							<CountryName v-if="person.country"
							:country-codes="person.country.countryCodes"
							:locale="person.country.locale"
							/>
						</div>
					</div>
				</template>

				<template #footer>
					<div v-if="item.button_group?.buttons?.length"
							class="flex justify-center image_left my-3 w-1/1">
							<ButtonGroup
								:buttons="item.button_group.buttons"
								:data-directus="
									setAttr({ 
										collection: 'block_button_group', 
										item: item.button_group?.id, 
										fields: 'buttons', 
										mode: 'modal' })
								"
							/>
						</div>
				</template>
				
				</UPageCard>
	</UCarousel>
</template>
