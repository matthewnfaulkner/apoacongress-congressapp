<script setup lang="ts">
import { UForm, UInput } from '#components';


interface PlenariesFormProps {
	modelValue: String,
	data: Symposium
}

const props = defineProps<PlenariesFormProps>();

const emit = defineEmits(['update:modelValue'])

const plenaryId = computed(() => props.data.id || null);
const value = ref();

</script>

<template>
	<UFormField label="Plenary Topic" name="eventSubType" class="w-full lg:w-50">
		<UInput :value="data.topic" value-key="topic"  @input="emit('update:modelValue', {id: plenaryId, topic : $event.target.value})"/>
	</UFormField>
</template>
