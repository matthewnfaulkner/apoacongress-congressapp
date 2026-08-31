<script setup lang="ts">
const config = useRuntimeConfig()

const nationalRedirectUrl = config.public.checkoutNationalRedirectUrl as string | undefined
</script>

<template>
  <CheckoutStepPage step="registration" title="Choose from the Registration Packages" next-path="/checkout/addons" require-selection>
    <template #banner>
      <p v-if="nationalRedirectUrl" class="text-description lg:mb-6">
        You're viewing the international checkout. Registering from Taiwan?
        <NuxtLink :to="nationalRedirectUrl" class="text-accent underline">Use the local registration site</NuxtLink>
        instead.
      </p>
    </template>
  </CheckoutStepPage>
</template>
