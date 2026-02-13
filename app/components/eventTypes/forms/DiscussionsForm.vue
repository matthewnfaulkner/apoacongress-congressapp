<script setup lang="ts">
import { UForm, UInput } from '#components';


interface DiscussionsFormProps {
	modelValue: String,
	data: Symposium
}

const props = defineProps<DiscussionsFormProps>();

const emit = defineEmits(['update:modelValue'])

const discussionId = computed(() => props.data.id || null);
const value = ref();

</script>

<template>
	<UFormField label="Discussion Topic" name="eventSubType" class="w-full lg:w-50">
		<UInput :value="data.topic" value-key="topic"  @input="emit('update:modelValue', {id: discussionId, topic : $event.target.value})"/>
	</UFormField>
</template>
