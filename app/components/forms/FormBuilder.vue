<script setup lang="ts">
import DynamicForm from './DynamicForm.vue';
import type { FormField } from '@@/shared/types/schema';
import { CheckCircle } from 'lucide-vue-next';

interface CustomFormData {
	id: string;
	on_success?: 'redirect' | 'message' | null;
	sort?: number | null;
	submit_label?: string | null;
	success_message?: string | null;
	title?: string | null;
	success_redirect_url?: string | null;
	is_active?: boolean | null;
	fields: FormField[];
	bot_protection?: boolean | null;
}

const props = withDefaults(
	defineProps<{
		form: CustomFormData;
		className?: string;
		bordered?: boolean;
		showSubmitButton?: boolean;
		persistedValues?: Record<string, any> | null;
		onValuesChange?: (values: Record<string, any>) => void;
	}>(),
	{ bordered: true, showSubmitButton: true },
);

const isSubmitted = ref(false);
const error = ref<string | null>(null);
const dynamicFormRef = ref<InstanceType<typeof DynamicForm> | null>(null);
// The form_submissions row id from the most recent successful submit — see
// complete.vue, which attaches it to the congress_order_owners claim written
// at bundle-creation time, so the submission can be traced back to whichever
// order it was for.
const lastSubmissionId = ref<string | null>(null);

const handleSubmit = async (data: Record<string, any>) => {
	error.value = null;
	try {
		const fieldsWithNames = props.form.fields.map((field) => ({
			id: field.id,
			name: field.name || '',
			type: field.type || '',
		}));

		const formData = new FormData();
		formData.append('formId', props.form.id);
		formData.append('fields', JSON.stringify(fieldsWithNames));

		for (const key in data) {
			if (data[key] instanceof File) {
				formData.append(key, data[key]);
			} else if (data[key] !== null && typeof data[key] === 'object') {
				// Object-shaped field values (e.g. the "address" field type)
				// need real serialization — plain .toString() on an object
				// produces the useless literal string "[object Object]".
				formData.append(key, JSON.stringify(data[key]));
			} else {
				formData.append(key, data[key]?.toString() || '');
			}
		}

		const config = useRuntimeConfig();
		const { $directusTokenStorage } = useNuxtApp();
		const accessToken = config.public.isSandbox ? null : ($directusTokenStorage as any).get()?.access_token;

		const response = await $fetch<{ success: boolean; id: string }>('/api/forms/submit', {
			method: 'POST',
			body: formData,
			headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
		});
		lastSubmissionId.value = response.id;

		if (props.form.on_success === 'redirect' && props.form.success_redirect_url) {
			window.location.href = props.form.success_redirect_url;
		} else {
			isSubmitted.value = true;
		}
	} catch (err) {
		error.value = 'Failed to submit the form. Please try again later.';
		// Rethrown so DynamicForm's exposed submit() (used when
		// showSubmitButton is false — see complete.vue) can tell a failed
		// submission apart from a successful one, rather than treating a
		// swallowed error as success.
		throw err;
	}
};

// Lets a parent (see complete.vue) trigger this form's validation + submission
// externally when showSubmitButton is false — e.g. one "Proceed to Payment"
// button doing double duty rather than a separate, confusing submit button
// for this form. Trivially succeeds when there's nothing to submit (an
// inactive form, or one already submitted this render).
defineExpose({
	submit: async (): Promise<boolean> => {
		if (!props.form.is_active || isSubmitted.value) return true;
		return (await dynamicFormRef.value?.submit()) ?? false;
	},
	lastSubmissionId,
});
</script>

<template>
	<div v-if="form.is_active" :class="['space-y-6 rounded-lg', bordered ? 'p-8 border border-input' : 'p-2', className]">
		<div v-if="error" class="p-4 text-red-500 bg-red-100 rounded-md">
			<strong>Error:</strong>
			{{ error }}
		</div>
		<div v-if="isSubmitted" class="flex flex-col items-center justify-center space-y-4 p-6 text-center" v>
			<CheckCircle className="size-12 text-green-500" />
			<p class="text-gray-600" v-html="form.success_message">
			</p>
		</div>
		<ClientOnly>
			<DynamicForm
				v-if="!isSubmitted"
				ref="dynamicFormRef"
				:fields="form.fields"
				:onSubmit="handleSubmit"
				:submitLabel="form.submit_label || 'Submit'"
				:formId="form.id"
				:showSubmitButton="showSubmitButton"
				:persistedValues="persistedValues"
				:onValuesChange="onValuesChange"
				:botProtection="form.bot_protection !== false"
			/>
		</ClientOnly>
	</div>
</template>
