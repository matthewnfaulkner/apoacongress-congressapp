<script setup lang="ts">
const props = defineProps<{ error: NuxtError }>()

const isServerDown = computed(() => (props.error?.statusCode ?? 500) >= 500)

function retry() {
	clearError({ redirect: '/' })
}
</script>

<template>
	<div class="flex flex-col items-center justify-center gap-4 h-lvh p-6 text-center">
		<UIcon
			:name="isServerDown ? 'i-lucide-server-crash' : 'i-lucide-file-question'"
			class="size-14 text-error"
		/>
		<Headline
			:headline="isServerDown ? 'Unable to reach the server' : 'Page not found'"
			as="h1"
		/>
		<Text
			as="p"
			size="lg"
			class="mx-auto max-w-md text-muted"
			:content="isServerDown
				? 'The server could not be reached. It may be temporarily down — please try again shortly.'
				: (error?.statusMessage || 'Oops! The page you are looking for does not exist.')"
		></Text>
		<UButton label="Try again" icon="i-lucide-refresh-cw" color="accent" @click="retry" />
	</div>
</template>
