<script setup lang="ts">

import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'

const { $directusTokenStorage } = useNuxtApp()

const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.getSiteData() as Site;

const config = useRuntimeConfig();
const enableChatAgent = config.public.enableChatAgent;

const supportForm = siteData.support_form ? siteData.support_form as Form : null;

const messages: UIMessage[] = [
	{
		id: 'greeting',
		role: 'assistant',
		parts: [{ type: 'text', text: 'Hello! I\'m the APOA 2027 virtual assistant. How can I help you today? I can answer questions about the conference schedule, registration, venue, and more.' }],
	},
]
const input = ref('')
const pendingMessages = ref<string[]>([])
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const chat = new Chat({
  messages,
  transport: new DefaultChatTransport({
    api: '/api/chat',
    headers: () => {
      const token = $directusTokenStorage.get()?.access_token as string | undefined
      return { Authorization: token ? `Bearer ${token}` : '' }
    },
  }),
})


const displayMessages = computed(() => [
  ...chat.messages,
  ...pendingMessages.value.map((text, i) => ({
    id: `pending-${i}`,
    role: 'user' as const,
    parts: [{ type: 'text' as const, text }],
  })),
])

function resetDebounce() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    const combined = pendingMessages.value.join('\n')
    pendingMessages.value = []
    try {
      await chat.sendMessage({ text: combined })
    } catch (e) {
      console.error(e)
    }
    debounceTimer = null
  }, 1500)
}

function onSubmit() {
  const text = input.value.trim()
  if (!text) return
  pendingMessages.value.push(text)
  input.value = ''
  resetDebounce()
}

watch(input, () => {
  if (pendingMessages.value.length) resetDebounce()
})

const open = ref(false);

</script>

<template>
	
		<UPopover v-if="enableChatAgent" :dismissible="false" :ui="{ content: 'sm:max-w-3xl h-100 sm:h-[28rem]' }" class="fixed bottom-10 right-10 z-100 h-4" v-model:open="open">
		
		<UChip color="accent" size="xl">
			<UButton  icon="i-lucide-message-circle"  color="accent" variant="solid" class="rounded-[100%] h-15 w-15 justify-center text-2xl"/>
		</UChip>
		<template #content="{ close }">
			<div class="flex justify-between gap-4 mb-4">
				<p class="text-lg p-2 text-accent font-bold"  color="accent"> AI Chat Assistant</p>
				<UButton color="neutral" size="xl" variant="ghost" icon="i-lucide-x" @click="close" />
			</div>
			<UChatPalette class="relative w-100 max-h-90">
				<UChatMessages
				:messages="displayMessages"
				:status="chat.status"
				should-auto-scroll 
				:auto-scroll="{
					color: 'neutral',
					variant: 'outline'
					}"
				:user="{ side: 'left', variant: 'naked', avatar: { src: 'https://github.com/benjamincanac.png' } }"
				:assistant="{ icon: 'i-lucide-bot', side: 'right'}"
				>
				<template #indicator>
					<UButton
						class="px-0"
						color="neutral"
						variant="link"
						loading
						loading-icon="i-lucide-loader"
						label="Thinking..."
					/>
				</template>
				<template #content="{ message }">
					<div class="">
					<template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
						<MDC
							v-if="part.type === 'text' && message.role === 'assistant'"
							:value="part.text"
							:cache-key="`${message.id}-${index}`"
							class="[&_.my-5]:my-2.5 *:first:!mt-0 *:last:!mb-0 [&_.leading-7]:!leading-6"
						/>

						<div v-if="part.type == 'tool-suggestSupportForm'">
							<p class="whitespace-pre-wrap">
								{{ (part?.input as any)?.reason }}
							</p>
							<FormBuilder v-if="supportForm?.fields?.length" :form="(supportForm as any)" />
							<UButton v-else to="/contact-us" label="Submit Support Request" color="secondary"/>
						</div>
						<p v-else-if="part.type === 'text' && message.role === 'user'" class="whitespace-pre-wrap">
							{{ part.text }}
						</p>
					</template>
					</div>
				</template>
				</UChatMessages>

				<template #prompt>
					<UChatPrompt
						v-model="input"
						icon="i-lucide-search"
						variant="naked"
						:error="chat.error"
						class="fixed bottom-0"
						@submit="onSubmit"
					>
					<template #leading>
						<UIcon v-if="chat.status == 'submitted'" name="i-lucide-loader"></UIcon>
					</template>
					</UChatPrompt>
				</template>
			</UChatPalette>
		</template>
	</UPopover>
</template>
