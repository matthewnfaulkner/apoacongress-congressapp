<script setup lang="ts">
import type { CongressEvent } from '~~/shared/types/schema';

interface BaseEventTypeFormProps {
	modelValue: Partial<CongressEvent>;
	data: CongressEvent;
}

const props = defineProps<BaseEventTypeFormProps>();

const emit = defineEmits(['update:modelValue']);
</script>

<template>
	<div class="relative flex flex-col gap-4">
		<UFormField v-if="data.type !== 'free_papers'" label="Topic" name="topic" class="w-full lg:w-50">
			<UInput
				:model-value="data.topic ?? ''"
				@update:model-value="emit('update:modelValue', { id: data.id, topic: $event })"
			/>
		</UFormField>
		<UFormField v-if="data.type === 'workshop'" label="Price" name="price" class="w-full lg:w-50">
			<UInput
				type="number"
				:model-value="data.price ?? undefined"
				@update:model-value="emit('update:modelValue', { id: data.id, price: Number($event) })"
			/>
		</UFormField>
	</div>
</template>
