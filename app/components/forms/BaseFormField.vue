<script setup lang="ts">
import type { FormField } from '#shared/types/schema';
import { useField } from 'vee-validate';

import Input from '~/components/ui/input/Input.vue';
import { Textarea } from '~/components/ui/textarea';
import CheckboxField from './fields/CheckboxField.vue';
import CheckboxGroupField from './fields/CheckboxGroupField.vue';
import CheckboxGroupAltField from './fields/CheckboxGroupAltField.vue';
import RadioGroupField from './fields/RadioGroupField.vue';
import SelectField from './fields/SelectField.vue';
import FileUploadField from './fields/FileUploadField.vue';
import VoucherField from './fields/VoucherField.vue';
import AddressField from './fields/AddressField.vue';
import PhoneField from './fields/PhoneField.vue';

const props = defineProps<{ field: FormField }>();
const { value, errorMessage } = useField(props.field.name ?? '');

const componentMap: Record<string, Component> = {
	textarea: Textarea,
	checkbox: CheckboxField,
	checkbox_group: CheckboxGroupField,
	checkbox_group_alt: CheckboxGroupAltField,
	radio: RadioGroupField,
	select: SelectField,
	file: FileUploadField,
	voucher: VoucherField,
	address: AddressField,
	phone: PhoneField,
};

const getFieldComponent = () => componentMap[props.field.type ?? ''] || Input;

const getComponentProps = (field: FormField) => {
	const baseProps = {
		id: field.id,
		name: field.name ?? '',
		placeholder: field.placeholder ?? '',
		modelValue: value.value,
		'onUpdate:modelValue': (val: any) => (value.value = val),
	};

	if (['checkbox_group', 'checkbox_group_alt', 'radio', 'select'].includes(field.type ?? '')) {
		return { ...baseProps, options: field.choices ?? [] };
	}

	if (field.type === 'checkbox') {
		return { ...baseProps, label: field.label ?? '' };
	}

	if (field.type === 'text') {
		return { ...baseProps, enableCopy: field.copy ?? false, readonly: field.readonly ?? false };
	}

	return baseProps;
};
</script>

<template>
	<div v-if="props.field.type !== 'hidden'" :class="`field-width-${field.width ?? '100'}`">
		<FormItem class="pt-2">
			<FormLabel :for="field.name ?? ''" class="flex items-center justify-between text-base">
				<span v-if="field.type !== 'checkbox'">{{ field.label ?? '' }}</span>
				<span v-if="field.required" class="text-sm text-gray-400">*Required</span>
			</FormLabel>
			<FormControl  class="">
				<component :is="getFieldComponent()" v-bind="getComponentProps(field)" />
			</FormControl>
			<p v-if="field.help" class="text-sm text-muted-foreground mt-1">{{ field.help }}</p>
			<FormMessage v-if="errorMessage" class="text-red-500 italic text-sm">{{ errorMessage }}</FormMessage>
		</FormItem>
	</div>
</template>

<style scoped>
.field-width-100 {
	flex: 100%;
}
.field-width-50 {
	flex: calc(50% - 1rem);
}
.field-width-67 {
	flex: calc(67% - 1rem);
}
.field-width-33 {
	flex: calc(33% - 1rem);
}
</style>
