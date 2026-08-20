<script setup lang="ts">
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { buildZodSchema } from '~/lib/zodSchemaBuilder';
import type { FormField } from '#shared/types/schema';
import BaseFormField from './BaseFormField.vue';
import BaseButton from '../base/BaseButton.vue';
import type { DirectusUser } from '@directus/sdk';


const authStore = useAuthStore();
const auth = authStore.isAuthenticated ? authStore.isAuthenticated as DirectusUser : {};


const route = useRoute();

const props = withDefaults(
	defineProps<{
		fields: FormField[];
		onSubmit: (data: Record<string, any>) => Promise<void> | void;
		submitLabel: string;
		formId?: string;
		showSubmitButton?: boolean;
		// Overrides the field-type-based defaults below (query params, logged-in
		// user data) — e.g. complete.vue reads this back from the persisted
		// checkout basket store, so values survive navigating away and back
		// within the checkout flow rather than resetting on remount.
		persistedValues?: Record<string, any> | null;
		// Fired (debounced) whenever the form's values change, so a parent can
		// persist them somewhere that survives this component unmounting.
		onValuesChange?: (values: Record<string, any>) => void;
	}>(),
	{ showSubmitButton: true },
);

const isSubmitting = ref(false);

const { setAttr } = useVisualEditing();

const sortedFields = computed(() => [...props.fields].sort((a, b) => (a.sort || 0) - (b.sort || 0)));

const validFields = computed(() =>
	sortedFields.value.filter((field): field is FormField & { name: string } => field.name != null && field.name !== ''),
);

const schema = computed(() => {
	if (!validFields.value.length) return null;
	try {
		const zodSchema = buildZodSchema(validFields.value);
		return toTypedSchema(zodSchema);
	} catch {
		return null;
	}
});

const initialValues = computed(() => {
	if (!validFields.value.length) return {};
	return validFields.value.reduce(
		(defaults, field) => {
			const name = field.name;
			const nameNormal = name.replace('-', '_');
			switch (field.type) {
				case 'checkbox':
					defaults[name] = false;
					break;
				case 'checkbox_group':
					defaults[name] = [];
					break;
				case 'select':	
				case 'radio':
					defaults[name] = '';
					break;
				case 'file':
					defaults[name] = null;
					break;
				case 'address':
					// Object-shaped, unlike every other field type here — must not
					// fall through to the default case's query-param/auth string
					// prefill logic, which doesn't apply to a structured address.
					defaults[name] = {
						street_number: '',
						address_line_1: '',
						address_line_2: '',
						city: '',
						country: '',
						state: '',
						postcode: '',
					};
					break;
				case 'textarea':
				case 'text':
				default: {
					const queryValue = route.query[name] ?? route.query[nameNormal];
					if (typeof queryValue === 'string') {
						defaults[name] = queryValue;
					} else {
						defaults[name] = nameNormal in auth ? auth[nameNormal as keyof typeof auth] : '';
					}
				}
			}

			return defaults;
		},
		{} as Record<string, any>,
	);
});

const { handleSubmit, values } = useForm({
	validationSchema: schema,
	// Persisted values (if any) win over the field-type defaults above — read
	// once here at setup, same as the defaults themselves; useForm's own
	// initialValues isn't reactive to later changes, which is fine, since
	// this only ever needs to apply once when the form (re)mounts.
	initialValues: { ...initialValues.value, ...(props.persistedValues ?? {}) },
});

if (props.onValuesChange) {
	// Debounced rather than firing on every keystroke — this only needs to
	// survive a navigation away, not stay byte-for-byte in sync in real time.
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	watch(
		values,
		(newValues) => {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => props.onValuesChange?.({ ...newValues }), 400);
		},
		{ deep: true },
	);
}

// Tracked separately from vee-validate's own state: this is specifically
// "did props.onSubmit run and complete" (i.e. validation passed AND the
// submit itself didn't throw), which is what an external caller (see
// defineExpose below) actually needs to know before treating this form as
// done.
const lastSubmitSucceeded = ref(false);

const onSubmitForm = handleSubmit(
	async (formValues) => {
		if (isSubmitting.value) return;
		lastSubmitSucceeded.value = false;
		try {
			isSubmitting.value = true;
			await props.onSubmit(formValues);
			lastSubmitSucceeded.value = true;
		} catch {
			// props.onSubmit (FormBuilder's handleSubmit) rethrows after setting
			// its own user-visible error state — caught here just to stop at
			// lastSubmitSucceeded = false rather than an unhandled rejection.
		} finally {
			isSubmitting.value = false;
		}
	},
	() => {
		lastSubmitSucceeded.value = false;
	},
);

// Lets a parent (e.g. FormBuilder, when showSubmitButton is false because
// something outside this form triggers submission — see complete.vue's
// "Proceed to Payment") validate + submit this form the same way the
// internal submit button would, and know whether it actually went through.
defineExpose({
	submit: async () => {
		await onSubmitForm();
		return lastSubmitSucceeded.value;
	},
});
</script>

<template>
	<form
		v-if="schema"
		:validation-schema="schema"
		:initial-values="initialValues"
		:data-directus="
			setAttr({
				collection: 'forms',
				item: props.formId,
				fields: 'fields',
				mode: 'popover',
			})
		"
		@submit.prevent="onSubmitForm"
	>
		<div class="flex flex-wrap gap-4">
			<BaseFormField v-for="field in validFields" :key="field.id" :field="field" :model-value="values[field.name]" />

			<div v-if="showSubmitButton" class="w-full">
				<div>
					<BaseButton
						:id="`submit-${submitLabel.replace(/\s+/g, '-').toLowerCase()}`"
						type="submit"
						:label="submitLabel"
						variant="solid"
						:disabled="isSubmitting"
						icon="arrow"
						icon-position="right"
					/>
				</div>
			</div>
		</div>
	</form>
</template>
