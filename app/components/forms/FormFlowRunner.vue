<script setup lang="ts">
import type { FormFlow, FormFlowStep as FlowStep, FormFlowField, FormFlowCondition, FormFlowRule } from '~~/shared/types/schema'

const props = defineProps<{ flow: FormFlow }>()

const steps = computed<FlowStep[]>(() => {
  if (!props.flow.steps) return []
  return [...(props.flow.steps as FlowStep[])].sort(
    (a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0)
  )
})

const stepFields = computed(() =>
  steps.value.map(step =>
    [...((step.fields as unknown as FormFlowField[]) ?? [])].sort(
      (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
    )
  )
)

const currentStepIndex = ref(0)
const stepHistory = ref<number[]>([])
const stepValues = reactive<Record<number, Record<string, any>>>({})
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const success = ref(false)
const direction = ref<'forward' | 'backward'>('forward')
const transitionName = computed(() => direction.value === 'forward' ? 'step-forward' : 'step-backward')
const showSummary = ref(false)
const returnToSummary = ref(false)

const currentStep = computed(() => steps.value[currentStepIndex.value])
const isLastStep = computed(() => currentStepIndex.value >= steps.value.length - 1)

function formatSummaryValue(val: any, type?: string | null): string {
  if (val === undefined || val === null || val === '') return '—'
  if (type === 'checkbox') return (val === true || val === 'true') ? 'Yes' : 'No'
  if (val instanceof File) return val.name
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—'
  return String(val)
}

const summaryItems = computed(() => {
  const visited = [...new Set([...stepHistory.value, currentStepIndex.value])]
  return visited.flatMap(idx => {
    const fields = (stepFields.value[idx] ?? []).filter(f => f.name && f.type !== 'hidden')
    const values = stepValues[idx] ?? {}
    return fields.map(f => ({
      label: f.label ?? f.name ?? '',
      value: formatSummaryValue(values[f.name!], f.type),
      stepIndex: idx,
    }))
  })
})

function jumpToStep(idx: number) {
  direction.value = 'backward'
  showSummary.value = false
  returnToSummary.value = true
  currentStepIndex.value = idx
}

function resolveNextStep(stepIndex: number, values: Record<string, any>): number {
  const step = steps.value[stepIndex]
  if (!step?.conditions?.length) return stepIndex + 1

  const allValues = {
    ...Object.values(stepValues).reduce<Record<string, any>>((acc, v) => ({ ...acc, ...v }), {}),
    ...values,
  }

  for (const group of step.conditions as FormFlowCondition[]) {
    const rules = (group.rules as FormFlowRule[]) ?? []
    const results = rules.map((rule) => {
      const fieldObj = typeof rule.field === 'object' && rule.field ? rule.field as FormFlowField : null
      const fieldName = fieldObj?.name ?? stepFields.value.flat().find(f => f.id === rule.field)?.name
      if (!fieldName) return false
      const actual = String(allValues[fieldName] ?? '')
      switch (rule.operator) {
        case '_eq':    return actual === rule.value
        case '_neq':   return actual !== rule.value
        case '_null':  return !actual
        case '_nnull': return !!actual
      }
    })

    const met = group.logical_operator === 'AND' ? results.every(Boolean) : results.some(Boolean)
    if (met && group.next_step) {
      const nextId = typeof group.next_step === 'string' ? group.next_step : (group.next_step as FlowStep).id
      const idx = steps.value.findIndex(s => s.id === nextId)
      if (idx !== -1) return idx
    }
  }

  return stepIndex + 1
}

async function onNext(values: Record<string, any>) {
  stepValues[currentStepIndex.value] = values
  direction.value = 'forward'
  if (returnToSummary.value) {
    returnToSummary.value = false
    showSummary.value = true
    return
  }
  const next = resolveNextStep(currentStepIndex.value, values)
  if (next < steps.value.length) {
    stepHistory.value.push(currentStepIndex.value)
    currentStepIndex.value = next
  } else {
    showSummary.value = true
  }
}

function onPrev() {
  direction.value = 'backward'
  if (showSummary.value) {
    showSummary.value = false
    return
  }
  if (returnToSummary.value) {
    returnToSummary.value = false
    showSummary.value = true
    return
  }
  const prev = stepHistory.value.pop()
  if (prev !== undefined) currentStepIndex.value = prev
}

async function submit() {
  isSubmitting.value = true
  submitError.value = null
  try {
    const seenIds = new Set<string>()
    const allFields = stepFields.value.flat().filter((f) => {
      if (!f.id || seenIds.has(f.id)) return false
      seenIds.add(f.id)
      return true
    }).map(f => ({ id: f.id, name: f.name ?? '', type: f.type ?? '' }))

    const allValues = Object.values(stepValues).reduce<Record<string, any>>(
      (acc, v) => ({ ...acc, ...v }), {}
    )
    const ownNames = new Set(allFields.map(f => f.name).filter(Boolean))

    const body = new FormData()
    body.append('flowId', props.flow.id)
    body.append('fields', JSON.stringify(allFields))
    for (const [key, val] of Object.entries(allValues)) {
      if (!ownNames.has(key)) continue
      body.append(key, val instanceof File ? val : String(val ?? ''))
    }

    const config = useRuntimeConfig();
    const { $directusTokenStorage } = useNuxtApp();
    const accessToken = config.public.isSandbox ? null : ($directusTokenStorage as any).get()?.access_token;

    await $fetch('/api/flows/submit', {
      method: 'POST',
      body,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
    if (props.flow.success_redirect_url) {
      navigateTo(props.flow.success_redirect_url)
    } else {
      success.value = true
    }
  } catch (e) {
    submitError.value = 'Failed to submit. Please try again later.'
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="success" class="flex flex-col items-center gap-6 py-16 text-center">
    <UIcon name="i-lucide-circle-check-big" class="text-8xl text-success" />
    <Headline headline="Submitted!" />
    <p v-if="flow.success_message" v-html="flow.success_message" class="text-muted max-w-md" />
    <p v-else class="text-muted max-w-md">
      Your submission has been received. A confirmation will be sent to you shortly.
    </p>
    <UButton label="Return to Home" color="accent" variant="solid" size="xl" to="/" />
  </div>

  <template v-else>
    <div v-if="flow.show_steps" class="flex items-center justify-between mb-6">
      <span class="text-sm font-medium">{{ showSummary ? 'Review' : (currentStep?.title ?? `Step ${currentStepIndex + 1}`) }}</span>
      <span class="text-xs text-muted">{{ showSummary ? steps.length + 1 : currentStepIndex + 1 }} / {{ steps.length + 1 }}</span>
    </div>

    <Transition :name="transitionName" mode="out-in" appear>
      <div v-if="showSummary" key="summary">
        <div class="divide-y divide-default mb-8">
          <div
            v-for="item in summaryItems"
            :key="item.label"
            class="flex justify-between items-center py-3 gap-4 group"
          >
            <span class="text-sm text-muted shrink-0">{{ item.label }}</span>
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-sm font-medium text-right truncate">{{ item.value }}</span>
              <UButton
                type="button"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                class="opacity-0 group-hover:opacity-100 shrink-0"
                @click="jumpToStep(item.stepIndex)"
              />
            </div>
          </div>
        </div>

        <UAlert v-if="submitError" color="error" variant="subtle" :description="submitError" class="mb-4" />

        <div class="flex justify-between items-center pt-2">
          <UButton type="button" label="Back" color="neutral" variant="outline" size="xl" leading-icon="i-lucide-arrow-left" @click="onPrev" />
          <UButton :label="flow.submit_label ?? 'Submit'" color="accent" variant="solid" size="xl" trailing-icon="i-lucide-send" :loading="isSubmitting" @click="submit" />
        </div>
      </div>

      <FormFlowStep
        v-else
        :key="currentStepIndex"
        :fields="stepFields[currentStepIndex] ?? []"
        :description="currentStep?.description ?? null"
        :is-first="currentStepIndex === 0 && !returnToSummary"
        :is-last="isLastStep"
        :back-label="returnToSummary ? 'Back to Summary' : 'Back'"
        :stored-values="stepValues[currentStepIndex]"
        @next="onNext"
        @prev="onPrev"
      />
    </Transition>
  </template>
</template>

<style scoped>
.step-forward-enter-active,
.step-forward-leave-active,
.step-backward-enter-active,
.step-backward-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.step-forward-enter-from  { opacity: 0; transform: translateX(30px); }
.step-forward-leave-to    { opacity: 0; transform: translateX(-30px); }
.step-backward-enter-from { opacity: 0; transform: translateX(-30px); }
.step-backward-leave-to   { opacity: 0; transform: translateX(30px); }
</style>
