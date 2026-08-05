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

const isChecked = (value: string) => props.modelValue.includes(value);

const toggleValue = (value: string, checked: boolean) => {
	const updatedValues = checked
		? [...props.modelValue, value]
		: props.modelValue.filter((v) => v !== value);
	emits('update:modelValue', updatedValues);
};


</script>

<template>
	<div class="flex flex-col gap-2">
		<UCheckbox
			v-for="option in options"
			:key="option.value"
			:name="`${name}-${option.value}`"
			:label="option.text"
			:model-value="isChecked(option.value)"
			color="secondary"
			:ui="{ base: 'w-5 h-5 border-2 border-gray-400 dark:border-gray-500' }"
			@update:model-value="(checked) => toggleValue(option.value, checked as boolean)"
		/>
	</div>
</template>
