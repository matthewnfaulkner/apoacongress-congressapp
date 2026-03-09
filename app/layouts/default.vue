<script setup lang="ts">
import { useSiteDataStore } from "~/stores/site-data";
import { useAuthStore } from "~/stores/auth";
const {
	data: siteData,
	error: siteError,
	refresh,
} = await useFetch('/api/site-data', {
	key: 'site-data',
});

if (siteError.value) {
	 createError({
		statusCode: 500,
		statusMessage: 'Failed to load site data. Please try again later.',
		fatal: true,
	});
}

const siteDataStore = useSiteDataStore();
siteDataStore.setSiteData(unref(siteData)?.site as Site);

const { isVisualEditingEnabled, apply } = useVisualEditing();

const navigation = useTemplateRef('navigationRef');
const footer = useTemplateRef('footerRef');

const canPreview = ref();
if(siteData.value?.site.preview) {
	const { $isAuthenticatedWithPolicy } = useNuxtApp();
	canPreview.value = await $isAuthenticatedWithPolicy('Administrator');
}




useHead({
	style: [
		{
			id: 'accent-color',
			innerHTML: `:root { --accent-color: ${unref(siteData)?.globals.accent_color || '#6644ff'} !important; }`,
		},
	],
	bodyAttrs: {
		class: 'antialiased font-sans',
	},
});

useSeoMeta({
	titleTemplate: `%s / ${unref(siteData)?.globals.title}`,
	ogSiteName: unref(siteData)?.globals.title,
});

onMounted(() => {
	if (!isVisualEditingEnabled.value) return;
	apply({
		elements: [navigation.value?.navigationRef as HTMLElement, footer.value?.footerRef as HTMLElement],
		onSaved: () => {
			refresh();
		},
	});
});


import { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'

const messages: UIMessage[] = []
const input = ref('')

const chat = new Chat({
  messages
})

function onSubmit() {
  chat.sendMessage({ text: input.value })

  input.value = ''
}
</script>

<template>
	<UError  v-if="siteError" :error="{
			statusCode: 404,
			statusMessage: 'Error',
			message: 'We are unable to complete your request, please try again later.'
			}">
			<template #links><div></div></template>
	</UError>
	<div v-else-if="siteData?.site.preview && !canPreview">
		<NuxtPage/>
	</div>
	<div  v-else>
		<NuxtNavigationBar
			v-if="siteData?.headerNavigation[0]"
			ref="navigationRef"
			:navigation="siteData.headerNavigation[0]"
			:site="siteData.site"
		/>
		<NuxtPage class="min-h-lvh"/>
		<UPopover :ui="{ content: 'sm:max-w-3xl sm:h-[28rem]' }" class="fixed bottom-10 right-10 z-100 h-4">
			<UChip color="accent" size="xl">
				<UButton  icon="i-lucide-message-circle"  color="accent" variant="solid" class="rounded-[100%] h-15 w-15 justify-center text-2xl"/>
			</UChip>
			<template #content>
			<UChatPalette class="relative w-100">
				<UChatMessages
				:messages="chat.messages"
				:status="chat.status"
				:user="{ side: 'left', variant: 'naked', avatar: { src: 'https://github.com/benjamincanac.png' } }"
				:assistant="{ icon: 'i-lucide-bot' }"
				>
				<template #content="{ message }">
					<template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
					<MDC
						v-if="part.type === 'text' && message.role === 'assistant'"
						:value="part.text"
						:cache-key="`${message.id}-${index}`"
						class="[&_.my-5]:my-2.5 *:first:!mt-0 *:last:!mb-0 [&_.leading-7]:!leading-6"
					/>
					<p v-else-if="part.type === 'text' && message.role === 'user'" class="whitespace-pre-wrap">
						{{ part.text }}
					</p>
					</template>
				</template>
				</UChatMessages>

				<template #prompt>
				<UChatPrompt
					v-model="input"
					icon="i-lucide-search"
					variant="naked"
					:error="chat.error"
					@submit="onSubmit"
				/>
				</template>
			</UChatPalette>
			</template>
		</UPopover>
		<Footer
			v-if="siteData?.footerNavigation[0]"
			ref="footerRef"
			:navigation="siteData.footerNavigation[0]"
			:site="siteData.site"
			:organiser="(siteData.site.congress && siteData.site.congress.length > 0) ? siteData.site.congress[0]?.organiser : null"
		/>
	</div>
</template>
