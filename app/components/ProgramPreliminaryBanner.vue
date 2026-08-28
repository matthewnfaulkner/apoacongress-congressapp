<script setup lang="ts">
// congress_schedules.preliminary marks a schedule as still subject to change.
// Callers pass in whatever schedule(s) they already fetched for their own
// page (day.get.ts / section.get.ts / schedule/index.get.ts) rather than this
// component re-fetching — keeps the disclaimer in sync with exactly what's
// actually being shown, instead of a separately-fetched, differently-filtered
// copy of the same data.
defineProps<{
	preliminary: boolean;
}>();

const dismissed = ref(false);
</script>

<template>
	<UAlert
		v-if="preliminary && !dismissed"
		color="secondary"
		variant="outline"
		icon="i-lucide-triangle-alert"
		close
		title="Preliminary program - This program is not final and is subject to change."
		:ui="{
			icon: 'size-20'
			}"
		@update:open="dismissed = true"
	/>
</template>
