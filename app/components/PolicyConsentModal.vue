<script setup lang="ts">
import type { Policy, DirectusUser } from '#shared/types/schema';

const { $directus, $readMe, $createItem } = useNuxtApp();
const authStore = useAuthStore();

const isOpen = ref(false);
const submitting = ref(false);

interface SitePolicyEntry {
	sitePolicyId: number;
	policy: Policy;
}

const sitePolicies = ref<SitePolicyEntry[]>([]);
const pendingPolicies = ref<SitePolicyEntry[]>([]);
const currentIndex = ref(0);
const consentValues = ref<Record<number, boolean>>({});

const route = useRoute();
const isOnPolicyPage = computed(() => route.path.startsWith('/policy/'));

const isLoggedIn = computed(
	() => authStore.isAuthenticated && typeof authStore.isAuthenticated === 'object',
);

const currentPolicy = computed(() => pendingPolicies.value[currentIndex.value] ?? null);
const isLastPolicy = computed(() => currentIndex.value === pendingPolicies.value.length - 1);
const currentConsent = computed({
	get: () => consentValues.value[currentIndex.value] ?? false,
	set: (val: boolean) => { consentValues.value[currentIndex.value] = val; },
});
const canProceed = computed(() => {
	if (!currentPolicy.value) return false;
	if (currentPolicy.value.policy.required) return currentConsent.value;
	return true;
});

const checkConsent = async () => {
	if (!isLoggedIn.value || isOnPolicyPage.value) return;

	try {
		if (!sitePolicies.value.length) {
			const data = await $fetch<SitePolicyEntry[]>('/api/policies/site');
			sitePolicies.value = data;
		}

		if (!sitePolicies.value.length) return;

		const me = await $directus.request(
			($readMe as any)({
				fields: ['id', { user_policy_agreements: ['id', 'active', { policy: ['id'] }] }],
			}),
		);

		const agreements = (me.user_policy_agreements || []) as any[];
		const activePolicyIds = new Set(
			agreements
				.filter((a: any) => typeof a === 'object' && a.active === true)
				.map((a: any) => a.policy?.id),
		);

		// required always shows regardless of show_on_login — that flag only
		// controls whether a non-required policy gets requested immediately at
		// login versus later via a form instead.
		pendingPolicies.value = sitePolicies.value.filter(
			(sp) => !activePolicyIds.has(sp.policy.id) && (sp.policy.required || sp.policy.show_on_login),
		);

		if (pendingPolicies.value.length) {
			currentIndex.value = 0;
			consentValues.value = Object.fromEntries(
				pendingPolicies.value.map((sp, i) => [i, sp.policy.default]),
			);
			isOpen.value = true;
		}
	} catch {
		// No policies configured — skip
	}
};

const handleNext = () => {
	if (currentIndex.value < pendingPolicies.value.length - 1) {
		currentIndex.value++;
	}
};

const handleSubmit = async () => {
	submitting.value = true;
	try {
		const userId = (authStore.isAuthenticated as DirectusUser).id;
		await Promise.all(
			pendingPolicies.value.map((sp, i) =>
				$directus.request(
					($createItem as any)('user_policy_agreements', {
						policy: sp.policy.id,
						user: userId,
						consent: consentValues.value[i] ?? false,
						active: true,
					}),
				),
			),
		);
		isOpen.value = false;
	} catch (e) {
		console.error('Failed to record policy consent', e);
	} finally {
		submitting.value = false;
	}
};

onMounted(checkConsent);

watch(
	() => authStore.isAuthenticated,
	(val) => {
		if (val && typeof val === 'object') checkConsent();
	},
);

watch(isOnPolicyPage, (onPolicy) => {
	if (onPolicy) isOpen.value = false;
});
</script>

<template>
	<UModal v-model:open="isOpen" :dismissable="false" :ui="{ overlay: 'backdrop-blur-sm' }">
		<template #content>
			<div v-if="currentPolicy" class="p-6 max-w-lg">
				<div class="flex items-center justify-between mb-1">
					<h2 class="text-xl font-bold">{{ currentPolicy.policy.name }}</h2>
					<span v-if="pendingPolicies.length > 1" class="text-sm text-gray-400">
						{{ currentIndex + 1 }} / {{ pendingPolicies.length }}
					</span>
				</div>

				<p class="text-sm text-gray-600 mb-4">
					{{ currentPolicy.policy.notification }}
				</p>
				<NuxtLink
					v-if="currentPolicy.policy.key"
					:to="`/policy/${currentPolicy.policy.key}`"
					target="_blank"
					class="text-accent underline text-sm block mb-6"
				>
					Read the full policy
				</NuxtLink>

				<div class="flex items-start gap-2 mb-6">
					<input
						:id="`consent-${currentIndex}`"
						v-model="currentConsent"
						type="checkbox"
						class="mt-0.5"
					/>
					<label :for="`consent-${currentIndex}`" class="text-sm">
						I agree to the {{ currentPolicy.policy.name }}
						<span v-if="currentPolicy.policy.required" class="text-red-500 ml-1">*</span>
					</label>
				</div>

				<p v-if="currentPolicy.policy.required && !currentConsent" class="text-xs text-red-500 mb-4">
					This policy is required to continue.
				</p>

				<div class="flex justify-end">
					<UButton
						v-if="!isLastPolicy"
						:disabled="!canProceed"
						@click="handleNext"
						color="accent"
						label="Next"
					/>
					<UButton
						v-else
						:disabled="!canProceed"
						@click="handleSubmit"
						color="accent"
						label="Submit"
					/>
				</div>
			</div>
		</template>
	</UModal>
</template>
