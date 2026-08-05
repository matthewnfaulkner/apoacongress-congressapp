<script setup lang="ts">
import type { UserPolicyAgreement } from '#shared/types/schema';
import { readMe, updateItem } from '@directus/sdk';
import { ConfirmationModal } from '~/components/ui/modal';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';

const toast = useToast();
const { $directus } = useNuxtApp();
const overlay = useOverlay();
const confirmationModal = overlay.create(ConfirmationModal);

const auth = await useAuthStore();
const isLoggedIn = computed(() => auth.isAuthenticated !== false);

const { data: agreements, refresh } = await useAsyncData<UserPolicyAgreement[]>(
	'policy-agreements-' + (isLoggedIn.value ? (auth.isAuthenticated as any).id : 'anon'),
	async () => {
		if (!isLoggedIn.value) return [];
		const me = await $directus.request(
			readMe({
				fields: [
					'id',
					{
						user_policy_agreements: [
							'id',
							'consent',
							'active',
							'date_created',
							'date_updated',
							{ policy: ['id', 'name', 'type', 'notification', 'required'] },
						],
					},
				],
			}),
		);
		return (me.user_policy_agreements || []) as UserPolicyAgreement[];
	},
);

const sortedAgreements = computed(() =>
	[...(agreements.value || [])].sort((a, b) => {
		if (a.active !== b.active) return a.active ? -1 : 1;
		return (b.date_created || '').localeCompare(a.date_created || '');
	}),
);

const withdrawingId = ref<string | null>(null);

const withdrawConsent = async (agreement: UserPolicyAgreement) => {
	const policyName = typeof agreement.policy === 'object' ? agreement.policy?.name : null;
	const isRequired = typeof agreement.policy === 'object' ? agreement.policy?.required : false;

	const instance = confirmationModal.open({
		title: 'Withdraw Consent?',
		helpMessage: isRequired
			? `This policy is required. Withdrawing consent may prompt you to agree again the next time you use the site: `
			: `You will no longer be considered to have agreed to `,
		helpMessageData: policyName || 'this policy',
		confirmLabel: 'Withdraw',
	});

	await instance.result.then(async (result: boolean) => {
		if (!result) return;
		withdrawingId.value = agreement.id;
		try {
			await $directus.request(updateItem('user_policy_agreements', agreement.id, { active: false }));
			if (agreements.value) {
				const target = agreements.value.find((a) => a.id === agreement.id);
				if (target) target.active = false;
			}
			toast.add({ title: 'Consent withdrawn', color: 'accent' });
		} catch (e) {
			console.error('Failed to withdraw consent', e);
			toast.add({ title: 'Failed to withdraw consent', color: 'error' });
		} finally {
			withdrawingId.value = null;
		}
	});
};

const policyName = (agreement: UserPolicyAgreement) =>
	(typeof agreement.policy === 'object' ? agreement.policy?.name : null) || 'Policy';
const policyType = (agreement: UserPolicyAgreement) =>
	typeof agreement.policy === 'object' ? agreement.policy?.type : null;
const policyNotification = (agreement: UserPolicyAgreement) =>
	typeof agreement.policy === 'object' ? agreement.policy?.notification : null;
const policyRequired = (agreement: UserPolicyAgreement) =>
	typeof agreement.policy === 'object' ? agreement.policy?.required : false;

useSeoMeta({
	title: 'My Policy Agreements',
	ogTitle: 'My Policy Agreements',
	robots: 'noindex',
});
</script>

<template>
	<UError
		v-if="!isLoggedIn"
		redirect="/login"
		:clear="{
			color: 'neutral',
			size: 'xl',
			trailingIcon: 'i-lucide-arrow-right',
			class: 'rounded-full',
			label: 'Log In',
		}"
		:error="{
			statusCode: 404,
			statusMessage: 'Sign In Required',
			message: 'You need to sign in to access this page.',
		}"
	/>
	<div v-else>
		<Container class="py-12 max-w-4xl">
			<Headline headline="My Policy Agreements" class="text-accent text-center" />
			<p class="text-center text-sm text-muted max-w-xl mx-auto mt-2 mb-10">
				Review the policies you have agreed to and withdraw your consent at any time.
			</p>

			<div v-if="!sortedAgreements.length" class="text-center text-muted">
				You have no recorded policy agreements yet.
			</div>

			<div v-else class="space-y-4">
				<UCard v-for="agreement in sortedAgreements" :key="agreement.id" class="ring-1 ring-accent/20">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<h3 class="font-heading text-lg leading-tight">{{ policyName(agreement) }}</h3>
								<UBadge
									v-if="agreement.active"
									color="accent"
									variant="subtle"
									icon="i-lucide-circle-check"
									label="Active"
								/>
								<UBadge v-else color="neutral" variant="subtle" icon="i-lucide-circle-x" label="Withdrawn" />
								<UBadge v-if="policyRequired(agreement)" color="warning" variant="subtle" label="Required" />
							</div>
							<p v-if="policyNotification(agreement)" class="text-sm text-muted mt-1">
								{{ policyNotification(agreement) }}
							</p>
							<div class="text-xs text-muted mt-2 space-y-0.5">
								<p>
									{{ agreement.consent ? 'Agreed' : 'Declined' }} on
									{{ new Date(agreement.date_created as string).toLocaleDateString() }}
								</p>
								<p v-if="agreement.date_updated">
									Last updated {{ new Date(agreement.date_updated as string).toLocaleDateString() }}
								</p>
							</div>
							<NuxtLink
								v-if="policyType(agreement)"
								:to="`/policies/${policyType(agreement)}`"
								target="_blank"
								class="text-accent underline text-sm inline-block mt-2"
							>
								Read the full policy
							</NuxtLink>
						</div>
						<UButton
							v-if="agreement.active"
							color="error"
							variant="outline"
							label="Withdraw"
							:loading="withdrawingId === agreement.id"
							class="shrink-0"
							@click="withdrawConsent(agreement)"
						/>
					</div>
				</UCard>
			</div>
		</Container>
	</div>
</template>
