<script setup lang="ts">
const props = defineProps<{
	modelValue: string[];
	name: string;
	options: { value: string; text: string }[];
	id?: string;
	placeholder?: string | null;
	'aria-describedby'?: string;
	'aria-invalid'?: boolean;
	class?: string;
}>();

const emits = defineEmits(['update:modelValue']);
</script>

<template>
	<div class="flex flex-col gap-2">
		<UCheckboxGroup
			:model-value="modelValue"
			label-key="text"
			:items="options"
			variant="card"
			color="accent"
			indicator="hidden"
			orientation="horizontal"
			class="w-full"
			@update:model-value="emits('update:modelValue', $event)"
			:ui="{
				fieldset: 'flex-wrap',
				item: 'has-data-[state=checked]:bg-accent/20'
			}"
			></UCheckboxGroup>
	</div>
</template>
