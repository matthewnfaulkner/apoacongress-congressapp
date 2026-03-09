<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
	modelValue: string;
	name: string;
	options?: { value: string; text: string }[];
	placeholder?: string;
}>();

const emits = defineEmits(['update:modelValue']);

const localValue = computed({
	get: () => props.modelValue,
	set: (value: string) => emits('update:modelValue', value),
});
</script>

<template>
	<USelect v-model="localValue" :items="options" label-key="text" value-key="value" variant="outline" class="w-48"/>
</template>
