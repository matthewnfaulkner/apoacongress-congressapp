<script setup lang="ts">
definePageMeta({
  layout: 'login',
})

import { z } from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { readMe, readPolicies, enableTwoFactor, generateTwoFactorSecret } from '@directus/sdk'
import QRCode from 'qrcode';

const { t } = useI18n();

const siteDataStore = useSiteDataStore();
const siteData = siteDataStore.siteData;

const { $directus } = useNuxtApp();
const toast = useToast()
const otpRequired = ref(false)
const loading = ref(false)

const showValidationErrors = ref(false);
const validationError = ref('');
/**
 * FIELDS
 */
const fields = computed((): AuthFormField[] => {
  return enforceTfa.value
    ? [
        {
          name: 'otp',
          type: 'text',
          label: 'One-Time Password',
          placeholder: 'Enter OTP'
        }
      ]
    : otpRequired.value ? [
        {
          name: 'email',
          type: 'email',
          label: t("email"),
        },
        {
          name: 'password',
          type: 'password',
          label: t("password")
        },
        {
          name: 'otp',
          type: 'text',
          label: 'One-Time Password',
          placeholder: 'Enter OTP'
        }
      ] : [
        {
          name: 'email',
          type: 'email',
          label: t("email"),
        },
        {
          name: 'password',
          type: 'password',
          label: t("password")
        }
      ]
})

/**
 * SCHEMA (must match fields!)
 */
const schema = computed(() => {
  return enforceTfa.value
    ? z.object({
        otp: z.string().min(6, 'OTP must be 6 digits')
      })
    : otpRequired.value ? z.object({
        email: z.string().email('Invalid email'),
        password: z.string().min(8, 'Password too short'),
        otp: z.string().length(6, 'OTP must be 6 digits')
      }) : z.object({
        email: z.string().email('Invalid email'),
        password: z.string().min(8, 'Password too short')
      })
})

type Schema = z.output<typeof schema.value>

const qrCodeUrl = ref('');
const qrCodeSecret = ref('');
const enforceTfa = ref(false);

async function login(payload: FormSubmitEvent<Schema>){
    loading.value = true
    const data = payload.data;
    if(!enforceTfa.value) {
      if(!otpRequired.value) {
        try{
            showValidationErrors.value = false;
            const response = await $directus.login({ email: data.email, password: data.password });

            const policies = await $directus.request(readPolicies()) as DirectusPolicy[];
            enforceTfa.value = policies.some(policy => policy.enforce_tfa);

            if (enforceTfa.value) { 
              const tfaSecret = await $directus.request(generateTwoFactorSecret(data.password));
              otpRequired.value = true
              qrCodeSecret.value = tfaSecret.secret;
              qrCodeUrl.value = await QRCode.toDataURL(await tfaSecret.otpauth_url);
            }
            const me = await $directus.request(readMe());

        } catch(error) {

            if(error.message == 'Invalid user OTP.') {
                otpRequired.value = true
                console.log('Enter OTP');
            } else {
              validationError.value = 'Incorrect user credentials.';
              showValidationErrors.value = true;
            }
        } finally {
        loading.value = false
      }
    } else {
        try{
              showValidationErrors.value = false;
              const response = await $directus.login({ email: data.email, password: data.password, otp: data.otp });
              navigateTo('/profile');
          } catch(error) {
              console.log(error);
              if(error.message == 'Invalid user OTP.') {
                  validationError.value = 'Incorrect OTP';
                  showValidationErrors.value = true;
                  console.log('Enter OTP');
              }
          } finally {
          loading.value = false
        }
    }
    }
    else {
      try{
        console.log(data)
        const response = await $directus.request(enableTwoFactor(qrCodeSecret.value, data.otp as string))
        navigateTo('/');
      } catch (error) {
        console.log(error)
      } finally {
      loading.value = false
    }
    }
}



</script>
  <template>
    <div class="flex flex-col items-center justify-center gap-4 p-4 h-lvh">
      <UPageCard class="w-full max-w-md ">
        <UAuthForm
          :schema="schema"
          title="Login"
          description="Enter your credentials to access your account."
          icon="i-lucide-user"
          
          :loading="loading"
          :fields="fields"
          :submit="{
              label: 'Submit',
              color: 'error',
              variant: 'solid',
              }"
          
        >
      <template #header>
        <UUser
          :name="siteData?.title"
          description="Admin Login"
          class="m-auto"
          size="3xl"
          orientation="vertical"
        >
          <template #avatar>
            <DirectusImage :uuid="siteData?.logo" class="h-25 w-25"/>
          </template>
        </UUser>
      </template>
      <template #leading>
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