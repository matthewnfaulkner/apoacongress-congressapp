<script setup lang="ts">
import { ConfirmationModal } from '~/components/ui/modal';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';

const toast = useToast();
const overlay = useOverlay();
const confirmationModal = overlay.create(ConfirmationModal);

const auth = await useAuthStore();
const isLoggedIn = computed(() => auth.isAuthenticated !== false);

const submitting = ref(false);
const requested = ref(false);

const requestData = async () => {
	const instance = confirmationModal.open({
		title: 'Request My Data?',
		helpMessage: "We'll start a request to compile the personal data we hold for ",
		helpMessageData: typeof auth.isAuthenticated === 'object' ? auth.isAuthenticated.email : 'your account',
		confirmLabel: 'Request',
	});

	await instance.result.then(async (result: boolean) => {
		if (!result) return;
		submitting.value = true;
		try {
			await $fetch('/api/data-request', { method: 'POST' });
			requested.value = true;
			toast.add({ title: 'Data request submitted', description: "We'll be in touch once it's ready.", color: 'accent' });
		} catch (e) {
			console.error('Failed to submit data request', e);
			toast.add({ title: 'Failed to submit request', description: 'Please try again later.', color: 'error' });
		} finally {
			submitting.value = false;
		}
	});
};

useSeoMeta({
	title: 'My Data Requests',
	ogTitle: 'My Data Requests',
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
		<Container class="py-12 max-w-2xl">
			<Headline headline="My Data Requests" class="text-accent text-center" />
			<p class="text-center text-sm text-muted max-w-xl mx-auto mt-2 mb-10">
				You can request a copy of the personal data we hold about you.
			</p>

			<UCard class="ring-1 ring-accent/20">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<h3 class="font-heading text-lg leading-tight">Request My Data</h3>
						<p class="text-sm text-muted mt-1">
							Submit a request to receive a copy of the personal data associated with your account.
						</p>
						<p v-if="requested" class="text-xs text-accent mt-2 flex items-center gap-1">
							<UIcon name="i-lucide-circle-check" />
							Request submitted. We'll be in touch once it's ready.
						</p>
					</div>
					<UButton
						color="accent"
						label="Request My Data"
						:loading="submitting"
						class="shrink-0"
						@click="requestData"
					/>
				</div>
			</UCard>
		</Container>
	</div>
</template>
