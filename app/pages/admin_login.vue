<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { readMe, readPolicies, enableTwoFactor, generateTwoFactorSecret } from '@directus/sdk'
import QRCode from 'qrcode';

definePageMeta({
  layout: 'login',
})

const { t } = useI18n();
const config = useRuntimeConfig();

const isSandbox = config.public.isSandbox;

const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.siteData;

const { $directus, $isAuthenticatedWithPolicy, $isAuthenticated } = useNuxtApp();

type LoginStep = 'email' | 'password'

const step = ref<LoginStep>('email')
const emailValue = ref('')
const otpRequired = ref(false)
const loading = ref(false)
const showValidationErrors = ref(false)
const validationError = ref('')
const qrCodeUrl = ref('');
const qrCodeSecret = ref('');
const enforceTfa = ref(false);

const fields = computed((): AuthFormField[] => {
  if (step.value === 'email') {
    return [{ name: 'email', type: 'email', label: t('Email') }]
  }
  if (enforceTfa.value) {
    return [{ name: 'otp', type: 'text', label: 'One-Time Password', placeholder: 'Enter OTP' }]
  }
  if (otpRequired.value) {
    return [
      { name: 'password', type: 'password', label: t('Password') },
      { name: 'otp', type: 'text', label: 'One-Time Password', placeholder: 'Enter OTP' }
    ]
  }
  return [{ name: 'password', type: 'password', label: t('Password') }]
})

const schema = computed(() => {
  if (step.value === 'email') {
    return z.object({ email: z.string().email('Invalid email') })
  }
  if (enforceTfa.value) {
    return z.object({ otp: z.string().min(6, 'OTP must be 6 digits') })
  }
  if (otpRequired.value) {
    return z.object({
      password: z.string().min(8, 'Password too short'),
      otp: z.string().length(6, 'OTP must be 6 digits')
    })
  }
  return z.object({ password: z.string().min(8, 'Password too short') })
})

type Schema = z.output<typeof schema.value>

const submitLabel = computed(() => step.value === 'email' ? 'Continue' : 'Login')
const formDescription = computed(() => step.value === 'email'
  ? 'Enter your email to continue.'
  : 'Enter your password to access your account.'
)

async function handleSubmit(payload: FormSubmitEvent<Schema>) {
  const data = payload.data as any
  if (step.value === 'email') {
    await checkProvider(data.email)
  } else {
    await login(data)
  }
}

async function checkProvider(email: string) {
  loading.value = true
  showValidationErrors.value = false
  try {
    const result = await $fetch<{ provider: string }>('/api/auth/provider', {
      query: { email }
    })
    if (result.provider === 'moodle') {
      window.location.href = config.public.loginUrl
      return
    }
    emailValue.value = email
    step.value = 'password'
  } catch {
    emailValue.value = email
    step.value = 'password'
  } finally {
    loading.value = false
  }
}

async function login(data: any) {
  loading.value = true

  if (enforceTfa.value) {
    try {
      await $directus.request(enableTwoFactor(qrCodeSecret.value, data.otp as string))
      navigateTo('/')
    } catch (error) {
      console.log(error)
    } finally {
      loading.value = false
    }
    return
  }

  if (!otpRequired.value) {
    try {
      showValidationErrors.value = false
      await $directus.login({ email: emailValue.value, password: data.password })

      const policies = await $directus.request(readPolicies()) as DirectusPolicy[]
      enforceTfa.value = policies.some(policy => policy.enforce_tfa)

      if (enforceTfa.value) {
        const tfaSecret = await $directus.request(generateTwoFactorSecret(data.password))
        otpRequired.value = true
        qrCodeSecret.value = tfaSecret.secret
        qrCodeUrl.value = await QRCode.toDataURL(await tfaSecret.otpauth_url)
      }

      const me = isSandbox ? await $isAuthenticatedWithPolicy('Sandbox - Access') : await $isAuthenticated();

      if (!me) {
        validationError.value = "You don't have permission to access this." 
        showValidationErrors.value = true
        await $directus.logout()
        loading.value = false
        return
      }

      navigateTo('/')
    } catch (error) {
      if (error.message === 'Invalid user OTP.') {
        otpRequired.value = true
      } else {
        validationError.value = 'Incorrect user credentials.'
        showValidationErrors.value = true
      }
    } finally {
      loading.value = false
    }
  } else {
    try {
      showValidationErrors.value = false
      await $directus.login({ email: emailValue.value, password: data.password, otp: data.otp })

      const me = isSandbox ? await $isAuthenticatedWithPolicy('Sandbox - Access') : await $isAuthenticated();
      if (!me) {
        validationError.value = "You don't have permission to access this." 
        showValidationErrors.value = true
        await $directus.logout()
        loading.value = false
        return
      }

      navigateTo('/')
    } catch (error) {
      console.log(error)
      if (error.message === 'Invalid user OTP.') {
        validationError.value = 'Incorrect OTP'
        showValidationErrors.value = true
      }
    } finally {
      loading.value = false
    }
  }
}

function goToApoaOnline() {
  window.location.href = config.public.loginUrl
}

</script>
  <template>

    <div class="flex flex-col items-center justify-center gap-4 p-4 h-lvh">
      <UPageCard class="w-full max-w-md ">
        <UButton 
            v-if="step === 'password'" 
            icon="i-lucide-arrow-left" 
            @click="step = 'email'" 
            variant="ghost" 
            color="secondary"
            class="w-fit">
          </UButton>
        <UAuthForm
          :key="step"
          :schema="schema"
          title="Login"
          :description="formDescription"
          icon="i-lucide-user"
          @submit="handleSubmit"
          :loading="loading"
          :fields="fields"
          :submit="{
              label: submitLabel,
              color: 'error',
              variant: 'solid',
              }"

        >
          <template #providers>
            
            <UButton
              label="APOA Online"
              icon="i-apoa-apoalogo"
              color="neutral"
              variant="subtle"
              class="w-full justify-center"
              @click="goToApoaOnline"
            />
          </template>
          <template #header>
            <UUser
              :name="(siteData as any)?.title"
              description="Admin Login"
              class="m-auto"
              size="3xl"
              orientation="vertical"
            >
              <template #avatar>
                <DirectusImage :uuid="(siteData as any)?.logo" class="h-25 w-25"/>
              </template>
            </UUser>
          </template>
          <template #leading>
            <div v-if="step === 'password' && !enforceTfa" class="text-sm text-gray-500 mb-2">
              Logging in as <span class="font-medium text-gray-800">{{ emailValue }}</span>
              <UButton variant="link" size="xs" class="ml-2" @click="step = 'email'">Change</UButton>
            </div>
            <div v-if="enforceTfa">
              <h3 class="text-2xl">Setup 2FA</h3>
              <p>Scan the code in your authenticator app to finish setting up 2FA</p>
              <img class="m-auto" :src="qrCodeUrl"/>
              <p>{{ qrCodeSecret }}</p>
            </div>
          </template>
          <template #password-hint>
            <ULink to="/forgotten_password" class="text-accent font-medium" tabindex="-1">Forgot password?</ULink>
          </template>
          <template #validation>
            <UAlert v-if="showValidationErrors" color="warning" class="text-black" icon="i-lucide-info" :title="validationError" />
          </template>
        </UAuthForm>
      </UPageCard>
    </div>
</template>
