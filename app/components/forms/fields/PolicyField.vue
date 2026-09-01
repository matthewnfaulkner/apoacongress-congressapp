<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Policy } from '#shared/types/schema';

const props = defineProps<{
	modelValue: boolean;
	name: string;
	policy?: Policy | string | null;
}>();

const emits = defineEmits(['update:modelValue']);

const localValue = computed({
	get: () => props.modelValue,
	set: (value: boolean) => emits('update:modelValue', value),
});

// form_fields.policy usually only carries a bare id — most of the places
// that fetch a form (FormBuilder's own callers) select form_fields with a
// wildcard and don't expand this relation — so this resolves the full
// policy (notification text + key for the link) itself instead of requiring
// every call site to remember to expand it.
const resolvedPolicy = ref<Policy | null>(typeof props.policy === 'object' && props.policy ? props.policy : null);

async function loadPolicy(policyRef: Policy | string | null | undefined) {
	if (!policyRef) return;

	if (typeof policyRef === 'object') {
		resolvedPolicy.value = policyRef;
		if (policyRef.notification && policyRef.key) return;
	}

	const id = typeof policyRef === 'string' ? policyRef : policyRef.id;

	try {
		const response = await $fetch<{ policy: Policy }>('/api/policies/one', { query: { id } });
		resolvedPolicy.value = response.policy;
	} catch {
		// Leave whatever partial data we already have — the checkbox itself
		// still works even if the notification text/link fails to load.
	}
}

watch(() => props.policy, loadPolicy, { immediate: true });
</script>

<template>
	<div class="flex items-start gap-2">
		<UCheckbox
			v-model="localValue"
			:name="name"
			color="secondary"
			:ui="{ base: 'w-5 h-5 border-2 border-gray-400 dark:border-gray-500 mt-0.5' }"
		/>
		<p class="text-sm">
			{{ resolvedPolicy?.notification || `I agree to the ${resolvedPolicy?.name || 'policy'}.` }}
			<NuxtLink
				v-if="resolvedPolicy?.key"
				:to="`/policy/${resolvedPolicy.key}`"
				target="_blank"
				class="text-accent underline"
			>
				Read {{ resolvedPolicy?.name || 'policy' }}
			</NuxtLink>
		</p>
	</div>
</template>
