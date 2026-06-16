<script setup lang="ts">
import { readMe } from '@directus/sdk'
import Input from '~/components/ui/input/Input.vue'
import { useVModel } from '@vueuse/core'

const { $directus } = useNuxtApp()
const config = useRuntimeConfig()

interface VoucherCode {
  code: string
  voucher: { name: string; description: string | null } | string | null
}

const voucherCodes = ref<VoucherCode[]>([])
const loading = ref(true)

const props = defineProps<{
  modelValue?: string | number
}>()

onMounted(async () => {
  try {
    const me = await $directus.request(readMe({
      fields: [{ voucher_codes: ['code', 'voucher.name', 'voucher.description'] }] as any,
      deep: {
        voucher_codes: {
          _filter: {
            status: {
              _eq: 'active'
            },
            voucher: {
              id: {
                _eq: "apoamember2027"
              },
              congress: {
                site: { _eq: config.public.siteId }
              }
            }
          }
        }
      } as any
    }))
    voucherCodes.value = ((me as any).voucher_codes ?? []) as VoucherCode[]
    if (voucherCodes.value[0]) {
      modelValue.value = voucherCodes.value[0].code
    }
  } catch {
    // not authenticated or no vouchers
  } finally {
    loading.value = false
  }
})

function voucherMeta(v: VoucherCode) {
  if (typeof v.voucher !== 'object' || !v.voucher) return { name: '', description: '' }
  return { name: v.voucher.name ?? '', description: v.voucher.description ?? '' }
}

const emits = defineEmits(['update:modelValue']);

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <UIcon v-if="loading" name="i-lucide-loader" class="animate-spin text-muted" />
    <template v-else-if="voucherCodes.length">
      <div v-for="v in voucherCodes" :key="v.code" class="flex flex-col gap-1">
        <span v-if="voucherMeta(v).name" class="text-base font-semibold">{{ voucherMeta(v).name }}</span>
        <Input :modelValue="v.code" class="text-xl font-mono bg-accent/20  border-accent border-2" :enableCopy="true" :readonly="true"/>
        <p v-if="voucherMeta(v).description" class="text-md">{{ voucherMeta(v).description }}</p>
      </div>
    </template>
    <p v-else class="text-sm text-muted-foreground">No voucher codes found for this congress.</p>
  </div>
</template>
