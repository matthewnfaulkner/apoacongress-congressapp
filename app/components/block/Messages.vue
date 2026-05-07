<script setup lang="ts">
import type { DirectusFile } from '@directus/sdk';
import  ButtonGroup  from '@/components/base/ButtonGroup.vue';

interface MessagesProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
		type: 'standard' | 'carousel';
		messages: [{
			id: string,
			people: [{
				id: string
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
				id: string;
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
	<Headline 
		:headline="data.headline"
		:data-directus="
				setAttr({
					collection: 'block_messages',
					item: data.id,
					fields: 'headline',
					mode: 'popover',
				})
			" />
	<div v-if="data.messages">
		<UCarousel 
			v-if="data.type == 'carousel'"
			class="max-w-screen" 
			:autoplay="{ delay: 2000 }"
			:overlay="false"
			arrows
			loop
			:items="data.messages"
			v-slot="{ item }"
			:ui="{
				root: 'group relative flex items-center overflow-hidden gap-0 ',
				item: 'md:basis-1/2 min-h-fit h-[-webkit-fill-available]',
				container: 'pb-10',
				dot: 'bg-accent size-5'
			}">
				<UPageCard
						:key="item.id"
						class="text-center ring-0 flex flex-row h-full "
						:ui="{
							container: 'gap-y-0 p-10 shadow-xl h-inherit',
							wrapper: 'mx-auto border-accent ',
							header: 'w-full',
							body: 'p-5 w-full',
							footer: 'w-full'
						}"
					>
					<template #header class="mx-auto">
						<Tagline 
							:tagline="item.tagline"
							:data-directus="
								setAttr({
									collection: 'block_messages_message',
									item: item.id,
									fields: 'tagline',
									mode: 'popover',
								})
							"/>
					</template>	
					<template #body>
						<div v-html="item.content" class="text-left lg:h-60"
						:data-directus="
								setAttr({
									collection: 'block_messages_message',
									item: item.id,
									fields: 'content',
									mode: 'popover',
								})
							">

						</div>
						<div class="flex flex-row justify-around"
							:data-directus="
								setAttr({
									collection: 'block_messages_message',
									item: item.id,
									fields: 'people',
									mode: 'popover',
								})
							">
							<div v-for="person in item.people" 
								>
								<ProfileImage class="h-40 mx-auto" :image="person.person.image":ui="{ item: 'basis-1/2' }" />
								<p class="font-heading">
									{{ person.person.first_name }} {{ person.person.last_name }}
								</p>
								<p
									:data-directus="
										setAttr({
											collection: 'block_messages_message_persons',
											item: person.id,
											fields: 'extra',
											mode: 'popover',
										})"
								>
									{{ person.extra }}
								</p>
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
		<div v-else class="clearfix">
			<div v-for="message in data.messages" class="flow-root"
			:data-directus="
							setAttr({
								collection: 'block_messages_message',
								item: message.id,
								fields: ['content', 'people'],
								mode: 'popover',
							})">
					<div v-for="person in message.people" class="text-center float-left mr-2 mb-4  w-1/2"
						>
							<ProfileImage class="mx-auto" :image="person.person.image":ui="{ item: 'basis-1/2' }"
								:data-directus="
									setAttr({
										collection: 'block_messages_message',
										item: message.id,
										fields: 'people',
										mode: 'popover',
									})" />
							<h2 class="font-heading text-lg sm:text-2xl">
								{{ person.person.first_name }} {{ person.person.last_name }}	
							</h2>
							<p 
								class="font-heading text-sm sm:text-lg text-accent"
								:data-directus="
										setAttr({
											collection: 'block_messages_message_persons',
											item: person.id,
											fields: 'extra',
											mode: 'popover',
										})"> 
								{{ person.extra }}
							</p>
							
					</div>
				<div 
					v-html="message.content" 
					class="text-left pt-10"
					>
				</div>
			</div>
		</div>
	</div>
	
</template>
