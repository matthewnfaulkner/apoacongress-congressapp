<script setup lang="ts">
import { ref } from 'vue';
import { usePlacesAutocomplete, geocodeByPlaceId } from 'vue-use-places-autocomplete'
import { cn } from '#shared/utils'

const emit = defineEmits(['update:modelValue']);

export type AddressComponent = {
    long_name: string
    short_name: string
    types: string[]
}

const value = ref('');
// No apiKey passed — relies on the site-wide Google Maps script loaded via
// nuxt.config.ts's app.head.script (async/defer, matches the source
// project's own approach), which starts fetching during the initial HTML
// parse rather than waiting for Nuxt's app to finish mounting.
const { suggestions } = usePlacesAutocomplete(value, {
  debounce: 500,
});

const handleSelect = async (prediction: { place_id: string }) => {
    const results = await geocodeByPlaceId(prediction.place_id)

    const result = results[0]
    if (result?.address_components instanceof Array) {
        const addressComponents = result.address_components.map((component: AddressComponent) => ({
            types: component.types,
            long_name: component.long_name,
            short_name: component.short_name
        }))

        emit('update:modelValue', addressComponents);
    }
};
</script>

<template>
  <div>
    <USelectMenu
        :items="suggestions"
        icon="i-lucide-house"
        placeholder="Begin typing address..."
        label-key="description"
        class="w-full max-w-1/1 text-wrap"
        variant="none"
        v-model:search-term="value"
        ignore-filter
        @update:model-value="handleSelect($event)"
        :ui="{
            value: 'text-wrap',
            base: cn('flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'),
            // --reka-popper-anchor-width is set by the underlying Reka UI
            // popper to the trigger's actual rendered width — without it the
            // suggestions panel sizes to its content instead of the field.
            content: cn('w-[var(--reka-popper-anchor-width)]'),
        }"
    >
    </USelectMenu>
  </div>
</template>
