<script setup lang="ts">
import { readItems } from '@directus/sdk';
import type { SupportCase } from '#shared/types/schema';

const { $directus } = useNuxtApp();
const auth = await useAuthStore();

const isLoggedIn = computed(() => auth.isAuthenticated !== false);

useSeoMeta({ title: 'My Support Tickets', ogTitle: 'My Support Tickets', robots: 'noindex' });

const statusColor: Record<string, string> = {
    new:         'info',
    open:        'info',
    in_progress: 'warning',
    pending:     'warning',
    escalated:   'danger',
    on_hold:     'neutral',
    resolved:    'success',
    closed:      'neutral',
    cancelled:   'neutral',
};

const statusLabel: Record<string, string> = {
    new:         'New',
    open:        'Open',
    in_progress: 'In Progress',
    pending:     'Pending',
    escalated:   'Escalated',
    on_hold:     'On Hold',
    resolved:    'Resolved',
    closed:      'Closed',
    cancelled:   'Cancelled',
};


const userId = typeof auth.isAuthenticated === 'object' ? auth.isAuthenticated.id : null;

const { data: tickets, pending } = useAsyncData<SupportCase[]>(
    'support-tickets-' + userId,
    async () => {
        if (!userId) return [];
        return await $directus.request<SupportCase[]>(
            readItems('support_cases', {
                filter: {
                    customer: { _eq: userId },
                },
                fields: [
                    'id',
                    'date_created',
                    'status',
                    'category',
                    'customer_first_name',
                    'customer_last_name',
                    'customer_email',
                    'summary',
                    {
                        messages: [
                            'id',
                            'date_created',
                            'sender_role',
                            'message',
                        ],
                    },
                ],
                sort: ['-date_created'],
            })
        );
    },
    { default: () => [], server: false }
);
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
            statusCode: 401,
            statusMessage: 'Sign In Required',
            message: 'You need to sign in to view your support tickets.',
        }"
    />

    <div v-else>
        <Container class="py-12">
            <Headline headline="My Support Tickets" class="text-accent text-center" />

            <ClientOnly>
                <div v-if="pending" class="flex justify-center py-16">
                    <UIcon name="i-lucide-loader-circle" size="48" class="text-accent animate-spin" />
                </div>

                <div v-else-if="!tickets?.length" class="text-center py-16 text-muted">
                    <UIcon name="i-lucide-inbox" size="48" class="mx-auto mb-3" />
                    <p class="text-lg">No support tickets yet.</p>
                    <UButton
                        label="Open a New Ticket"
                        color="accent"
                        variant="solid"
                        class="mt-4"
                        to="/contact-us"
                    />
                </div>
                
                <div v-else class="max-w-3xl mx-auto space-y-4 mt-8">
                    <UButton
                        label="Open a New Ticket"
                        color="accent"
                        variant="solid"
                        class="mt-4"
                        to="/contact-us"
                    />
                    <UCard
                        v-for="ticket in tickets"
                        :key="ticket.id"
                        class="ring-1 ring-gray-200 dark:ring-gray-800"
                    >
                        
                        <h3>Case: #{{ticket.id.slice(0, 8)}} <p class="py-2 text-lg text-accent">{{ ticket.summary }}</p></h3> 
                    
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <UBadge
                                        :color="statusColor[ticket.status ?? 'open'] as any"
                                        variant="subtle"
                                        :label="statusLabel[ticket.status ?? 'open'] ?? ticket.status"
                                    />
                                    <span v-if="ticket.category" class="text-xs text-muted">{{ ticket.category }}</span>
                                </div>
                                <p class="text-sm text-muted">
                                    Opened {{ new Date(ticket.date_created!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                                </p>
                            </div>
                            <div class="text-right text-sm text-muted shrink-0">
                                <span>{{ (ticket.messages as any[])?.length ?? 0 }} message{{ (ticket.messages as any[])?.length === 1 ? '' : 's' }}</span>
                            </div>
                        </div>

                        <!-- Latest message preview -->
                        <div v-if="(ticket.messages as any[])?.length" class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <p class="text-xs text-muted mb-1 uppercase tracking-wide">Latest message</p>
                            <p class="text-sm line-clamp-2">{{ (ticket.messages as any[]).at(-1)?.message }}</p>
                        </div>

                        <template #footer>
                            <div class="flex justify-end">
                                <UButton
                                    label="View Ticket"
                                    color="accent"
                                    variant="ghost"
                                    trailing-icon="i-lucide-arrow-right"
                                    :to="`/support/${ticket.id}`"
                                />
                            </div>
                        </template>
                    </UCard>
                </div>
            </ClientOnly>
        </Container>
    </div>
</template>
