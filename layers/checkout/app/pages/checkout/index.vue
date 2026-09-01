<script setup lang="ts">
const config = useRuntimeConfig()
const auth = useAuthStore()

// Same object-vs-false idiom used elsewhere (e.g. useCheckoutEvent.ts's
// isMember) — the auth store's isAuthenticated is either `false` or the
// logged-in user object.
const isLoggedIn = computed(() => typeof auth.isAuthenticated === 'object')

const nationalRedirectUrl = config.public.checkoutNationalRedirectUrl as string | undefined

const loginPromptDismissed = ref(false)
</script>

<template>

  <CheckoutStepPage step="registration" title="Choose from the Registration Packages" next-path="/checkout/addons" require-selection>
    <template #banner>
     <UAlert
        v-if="!isLoggedIn && !loginPromptDismissed"
        color="info"
        variant="subtle"
        icon="i-lucide-user"
        title="You're not logged in"
        close
        class="mb-6"
        @update:open="loginPromptDismissed = true"
      >
        <template #description>
          We recommend signing in to your APOA 2027 account. It will make managing your congress experience much easier.
          <NuxtLink to="/login" class="text-accent underline">Click to Sign In</NuxtLink>.
        </template>
      </UAlert>
      <p v-if="nationalRedirectUrl" class="text-description lg:mb-6">
        You're viewing the international checkout. <br> Registering from Taiwan?
        <NuxtLink :to="nationalRedirectUrl" class="text-accent underline">Use the local registration site</NuxtLink>
        instead.
      </p>
    </template>
  </CheckoutStepPage>
</template>
