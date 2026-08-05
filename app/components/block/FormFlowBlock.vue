<script setup lang="ts">
import type { FormFlow } from '~~/shared/types/schema'

interface BlockFormFlowData {
  id: string
  tagline?: string | null
  headline?: string | null
  form_flow: FormFlow
}

const { setAttr } = useVisualEditing()
defineProps<{ data: BlockFormFlowData }>()

const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <section v-if="data.form_flow?.is_active">
    <Tagline
      v-if="data.tagline"
      :tagline="data.tagline"
      :data-directus="setAttr({ collection: 'block_form_flow', item: data.id, fields: 'tagline', mode: 'popover' })"
    />
    <Headline
      v-if="data.headline"
      :headline="data.headline"
      :data-directus="setAttr({ collection: 'block_form_flow', item: data.id, fields: 'headline', mode: 'popover' })"
    />

    <div
      v-if="ready"
      :data-directus="setAttr({ collection: 'block_form_flow', item: data.id, fields: ['form_flow'], mode: 'popover' })"
    >
      <FormFlowRunner :flow="data.form_flow" />
    </div>
  </section>
</template>
