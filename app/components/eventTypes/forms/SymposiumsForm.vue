<script setup lang="ts">
import { UForm, UInput } from '#components';


interface SymposiumsFormProps {
	modelValue: String,
	data: Symposium,
}

const props = defineProps<SymposiumsFormProps>();

const emit = defineEmits(['update:modelValue'])

const symposiumId = computed(() => props.data.id || null);

</script>

<template>
	<UFormField label="Symposium Topic" name="eventSubType" class="w-full lg:w-50">
		<UInput :value="data.topic" value-key="topic"  @input="emit('update:modelValue', {id: symposiumId, topic : $event.target.value})"/>
	</UFormField>
</template>
