<script setup lang="ts">
import * as z from 'zod'
import { cn } from '#shared/utils'
import PlacesAutocomplete from '~/components/ui/PlacesAutocomplete/PlacesAutocomplete.vue'
import CountrySelectMenu from '~/components/ui/dynamic-select-menus/CountrySelectMenu.vue'
import Input from '~/components/ui/input/Input.vue'

// Same base classes BaseFormField.vue's default text input (Input.vue) and
// SelectField.vue already use, so this field's inputs match every other
// field type rendered by DynamicForm rather than looking like a distinct
// design system.
const selectUi = {
    base: cn('flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'),
    // --reka-popper-anchor-width is set by the underlying Reka UI popper to
    // the trigger's actual rendered width — without it the dropdown panel
    // sizes to its content instead of matching the field.
    content: cn('w-[var(--reka-popper-anchor-width)]'),
}

type AddressSchema = {
    street_number?: string,
    address_line_1?: string,
    address_line_2?: string,
    city?: string,
    country?: string,
    state?: string,
    postcode?: string,
}

type AddressComponent = {
    long_name: string
    short_name: string
    types: string[]
}

const props = defineProps<{
	modelValue: AddressSchema;
	name: string;
}>();

const emit = defineEmits(['update:modelValue']);

const schema = z.object({
    street_number: z.string().min(1, 'Required').optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
})

const addressMapping: Record<string, keyof AddressSchema> = {
    street_number: 'street_number',
    route: 'address_line_1',
    neighborhood: 'address_line_2',
    sublocality: 'address_line_2',
    locality: 'city',
    country: 'country',
    administrative_area_level_1: 'state',
    postal_code: 'postcode'
}

const fillAddress = (addressComponents: AddressComponent[]) => {
  let freshState: AddressSchema = {
    street_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    country: '',
    state: '',
    postcode: '',
  }

  addressComponents.forEach((component) => {
    component.types.forEach((type) => {
      const field = addressMapping[type as keyof typeof addressMapping]
      if (!field) return // skip unmapped types

      // For fields that can have multiple types (like address_line_2)
      if (field == 'country') {
        freshState[field] = component.short_name
      }
      else if (freshState[field]) {
        freshState[field] += ' ' + component.long_name
      } else {
        freshState[field] = component.long_name
      }
    })
  })

  emit('update:modelValue', {
    ...props.modelValue,
    ...freshState
  })
}
</script>

<template>
    <UForm :schema="schema" nested>
        <PlacesAutocomplete @update:modelValue="fillAddress($event)" />
        <UFormField label="Street/Unit Number" required>
                <Input :model-value="modelValue.street_number" @update:model-value="emit('update:modelValue', { ...modelValue, street_number: $event })" name="street_number" class="w-full"></Input>
        </UFormField>
        <UFormField label="Address Line 1" required>
                <Input :model-value="modelValue.address_line_1" @update:model-value="emit('update:modelValue', { ...modelValue, address_line_1: $event })" name="address_line_1" class="w-full"></Input>
        </UFormField>
        <UFormField label="Address Line 2">
                <Input :model-value="modelValue.address_line_2" @update:model-value="emit('update:modelValue', { ...modelValue, address_line_2: $event })" name="address_line_2" class="w-full"></Input>
        </UFormField>
        <UFormField label="City" required>
                <Input :model-value="modelValue.city" @update:model-value="emit('update:modelValue', { ...modelValue, city: $event })" name="city" class="w-full"></Input>
        </UFormField>
        <UFormField label="State">
                <Input :model-value="modelValue.state" @update:model-value="emit('update:modelValue', { ...modelValue, state: $event })" name="state" class="w-full"></Input>
        </UFormField>
        <UFormField label="Country" class="w-full" name="country" required>
            <CountrySelectMenu :model-value="modelValue.country" @update:model-value="emit('update:modelValue', { ...modelValue, country: $event })" value-key="code" variant="none" :ui="selectUi" class="w-full"/>
        </UFormField>
        <UFormField label="Postcode" required>
                <Input :model-value="modelValue.postcode" @update:model-value="emit('update:modelValue', { ...modelValue, postcode: $event })" name="postcode" class="w-full"></Input>
        </UFormField>
    </UForm>
</template>
