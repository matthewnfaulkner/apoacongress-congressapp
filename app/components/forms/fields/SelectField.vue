<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { cn } from '#shared/utils';

const props = defineProps<{
	modelValue: string;
	name: string;
	options?: { value: string; text: string }[];
	placeholder?: string;
	class?: HTMLAttributes['class'];
}>();

const emits = defineEmits(['update:modelValue']);

const localValue = computed({
	get: () => props.modelValue,
	set: (value: string) => emits('update:modelValue', value),
});
</script>

<template>
	<USelect
		v-model="localValue"
		:items="options"
		label-key="text"
		value-key="value"
		:placeholder="placeholder"
		variant="none"
		:ui="{
			base: cn('flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', props.class),
		}"
	/>
</template>
