<script setup lang="ts">
import type { CongressEvent } from '~~/shared/types/schema';

interface BaseEventTypeProps {
	event: CongressEvent;
}

const props = defineProps<BaseEventTypeProps>();

const summary = computed(() => {
	const bits = [
		props.event.title,
		props.event.topic,
	].filter(Boolean);

	if (props.event.type === 'workshop' && props.event.price != null) {
		bits.push(`$${props.event.price}`);
	}

	return bits.join(' — ');
});
</script>

<template>
	<div class="text-wrap">{{ summary }}</div>
</template>
