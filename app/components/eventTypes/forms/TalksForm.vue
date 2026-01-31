<script setup lang="ts">
import { UForm, UInput } from '#components';


interface TalksFormProps {
	modelValue: String,
	data: Symposium
}

const props = defineProps<TalksFormProps>();

const emit = defineEmits(['update:modelValue'])

const talkId = computed(() => props.data.id || null);

const value = ref();

</script>

<template>
	<UFormField label="Talk Topic" name="eventSubType" class="w-full lg:w-50">
		<UInput :value="data.topic" value-key="topic"  @input="emit('update:modelValue', {id: talkId, topic : $event.target.value})"/>
	</UFormField>
</template>
