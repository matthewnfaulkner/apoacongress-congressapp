<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
	modelValue: boolean;
	name: string;
	label: string;
}>();

const emits = defineEmits(['update:modelValue']);

const localValue = computed({
	get: () => props.modelValue,
	set: (value: boolean) => emits('update:modelValue', value),
});
</script>

<template>
	<UCheckbox
		v-model="localValue"
		:name="name"
		:label="label"
		color="secondary"
		:ui="{ base: 'w-5 h-5 border-2 border-gray-400 dark:border-gray-500' }"
	/>
</template>
