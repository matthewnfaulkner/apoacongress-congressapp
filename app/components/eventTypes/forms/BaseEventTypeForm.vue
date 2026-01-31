<script setup lang="ts">
import SymposiumsForm from './SymposiumsForm.vue';
import TalksForm from './TalksForm.vue';
import PlenariesForm from './PlenariesForm.vue';

interface BaseEventTypeProps {
	defaultValue: object,
	modelValue: [String, Number, Object],
	type: {
		collection: string;
		item?: any;
		id?: string;
	};
}

const props = defineProps<BaseEventTypeProps>();

const formRef = ref<HTMLElement | null>(null);

const emit = defineEmits(['update:modelValue'])

const components: Record<string, any> = {
	symposiums: SymposiumsForm,
	talks: TalksForm,
	plenaries: PlenariesForm,
};

const Component = computed(() => components[props.type.collection] || null);
const componentData = computed(() => props.type.item);
</script>

<template>
	<div ref="formRef" class="relative">
		<component 
			:modelValue="modelValue" 
			:is="Component" v-if="Component" 
			:id="`eventType-${type.id}`" 
			:data="componentData" 
			@update:modelValue="emit('update:modelValue', $event)"/>
	</div>
</template>
