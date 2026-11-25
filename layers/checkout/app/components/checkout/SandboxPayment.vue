<script setup lang="ts">
/**
 * SANDBOX ONLY — replaces Ticket Tailor's checkout widget on the payment
 * step. Each button stands in for one way a real payment can end; see
 * server/api/checkout/sandbox/pay.post.ts.
 */
const props = defineProps<{ bundleId: string }>()

const { store } = useCheckoutBasket()
const auth = useAuthStore()

// Ticket Tailor's checkout asks for these; blank = use the checkout form's
// answers or the logged-in profile.
const buyer = reactive({ first_name: '', last_name: '', email: '' })

const busy = ref<'pending' | 'completed' | 'failed' | null>(null)
const failed = ref(false)
const errorMessage = ref<string | null>(null)

async function pay(outcome: 'pending' | 'completed' | 'failed') {
  busy.value = outcome
  failed.value = false
  errorMessage.value = null

  try {
    const result = await $fetch<{ outcome: string; orderId: string | null }>('/api/checkout/sandbox/pay', {
      method: 'POST',
      headers: auth.lastToken ? { Authorization: `Bearer ${auth.lastToken}` } : undefined,
      body: { bundleId: props.bundleId, outcome, guestToken: store.guestOrderToken, buyer },
    })

    if (!result.orderId) {
      failed.value = true
      return
    }

    // Same landing page Ticket Tailor's redirect sends people to.
    await navigateTo(`/checkout/confirmation?tt_order_id=${encodeURIComponent(result.orderId)}`)
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage ?? 'Something went wrong. Please try again.'
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl border-2 border-dashed border-warning rounded-lg p-5 space-y-5">
    <div class="flex items-start gap-3">
      <UIcon name="i-lucide-flask-conical" class="size-6 shrink-0 text-warning" />
      <div>
        <h2 class="text-lg font-semibold text-foreground">Sandbox payment</h2>
        <p class="text-sm text-foreground">No payment is taken. Choose how this payment should end.</p>
      </div>
    </div>

    <div class="space-y-3">
      <p class="text-sm text-description">Buyer details (leave blank to use the checkout form or your account).</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UFormField label="First name">
          <UInput v-model="buyer.first_name" class="w-full" />
        </UFormField>
        <UFormField label="Last name">
          <UInput v-model="buyer.last_name" class="w-full" />
        </UFormField>
      </div>
      <UFormField label="Email">
        <UInput v-model="buyer.email" type="email" class="w-full" />
      </UFormField>
    </div>

    <div class="flex flex-col gap-3">
      <UButton
        block
        color="success"
        size="xl"
        icon="i-lucide-credit-card"
        label="Instant payment (confirmed)"
        :loading="busy === 'completed'"
        :disabled="busy !== null"
        @click="pay('completed')"
      />
      <UButton
        block
        color="neutral"
        variant="outline"
        size="xl"
        icon="i-lucide-landmark"
        label="Bank transfer (pending)"
        :loading="busy === 'pending'"
        :disabled="busy !== null"
        @click="pay('pending')"
      />
      <UButton
        block
        color="error"
        variant="outline"
        size="xl"
        icon="i-lucide-circle-x"
        label="Payment failed"
        :loading="busy === 'failed'"
        :disabled="busy !== null"
        @click="pay('failed')"
      />
    </div>

    <UAlert
      v-if="failed"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-x"
      title="Payment failed"
      description="The payment gateway declined this payment. No order was created — try again."
    />
    <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>
  </div>
</template>
