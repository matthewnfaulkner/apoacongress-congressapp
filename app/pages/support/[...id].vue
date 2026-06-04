<script setup lang="ts">
import type { SupportCase, CaseMessage } from '#shared/types/schema';

const auth = await useAuthStore();
const route = useRoute();
const toast = useToast();

const isLoggedIn = computed(() => auth.isAuthenticated !== false);
const userId = typeof auth.isAuthenticated === 'object' ? auth.isAuthenticated.id : null;
const userEmail = typeof auth.isAuthenticated === 'object' ? (auth.isAuthenticated as any).email : null;
const ticketId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;

useSeoMeta({ title: 'Support Ticket', ogTitle: 'Support Ticket', robots: 'noindex' });

const statusColor: Record<string, string> = {
    open:        'info',
    in_progress: 'warning',
    resolved:    'success',
    closed:      'neutral',
};

const statusLabel: Record<string, string> = {
    open:        'Open',
    in_progress: 'In Progress',
    resolved:    'Resolved',
    closed:      'Closed',
};

const { data: ticket, pending } = useAsyncData<SupportCase>(
    'support-ticket-' + ticketId,
    () => $fetch<SupportCase>('/api/support/get-ticket', {headers: useRequestHeaders(['cookie']), query: { id: ticketId } }),
    { server: false }
);

const messages = computed<CaseMessage[]>(() => {
    if (!ticket.value?.messages) return [];
    const list = [...(ticket.value.messages as CaseMessage[])];
    return timelineReversed.value ? list.reverse() : list;
});

// Reply form
const messageText = ref('');
const attachments = ref<File[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const submitting = ref(false);
const timelineReversed = ref(false);
const showScrollHint = ref(false);

const flashScrollHint = () => {
    showScrollHint.value = true;
    setTimeout(() => { showScrollHint.value = false; }, 1500);
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const onFileChange = (e: Event) => {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    (e.target as HTMLInputElement).value = '';
    for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.add({ title: 'Invalid file type', description: `${file.name} must be JPEG, PNG or PDF.`, color: 'error' });
            continue;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.add({ title: 'File too large', description: `${file.name} must be under 5 MB.`, color: 'error' });
            continue;
        }
        attachments.value.push(file);
    }
};

const removeAttachment = (index: number) => attachments.value.splice(index, 1);

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const submitReply = async () => {
    if (!messageText.value.trim()) return;
    submitting.value = true;
    try {
        const fd = new FormData();
        fd.append('ticketId', ticketId as string);
        fd.append('userId', userId ?? '');
        fd.append('userEmail', userEmail ?? '');
        fd.append('message', messageText.value.trim());
        if (ticket.value?.folder) fd.append('folder', ticket.value.folder as string);
        for (const file of attachments.value) {
            fd.append('file', file, file.name);
        }

        const newMessage = await $fetch<CaseMessage>('/api/support/submit-message', {
            method: 'POST',
            body: fd,
        });


        if (ticket.value) {
            ticket.value = {
                ...ticket.value,
                messages: timelineReversed ?  [newMessage, ...(ticket.value.messages as CaseMessage[])] :  [...(ticket.value.messages as CaseMessage[]), newMessage],
            };
        }

        messageText.value = '';
        attachments.value = [];
        toast.add({ title: 'Message sent', color: 'accent' });
        if (!timelineReversed.value) flashScrollHint();
    } catch (e) {
        console.error(e);
        toast.add({ title: 'Failed to send message', color: 'error' });
    } finally {
        submitting.value = false;
    }
};


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
            message: 'You need to sign in to view this ticket.',
        }"
    />

    <div v-else>
        <Container class="py-12">

            <UButton
                label="All Tickets"
                icon="i-lucide-chevron-left"
                color="neutral"
                variant="ghost"
                to="/support/mytickets"
                class="mb-6"
            />

            <div v-if="pending" class="flex justify-center py-16">
                <UIcon name="i-lucide-loader-circle" size="48" class="text-accent animate-spin" />
            </div>

            <template v-else-if="ticket">

                <!-- Ticket header -->
                <UCard class="mb-8 ring-1 ring-accent/20">
                    <div class="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p class="text-xs text-muted mb-1">Case #{{ ticket.id.slice(0, 8) }}</p>
                            <h1 class="font-heading text-2xl">{{ (ticket as any).summary ?? 'Support Ticket' }}</h1>
                        </div>
                        <UBadge
                            :color="statusColor[ticket.status ?? 'open'] as any"
                            variant="subtle"
                            size="lg"
                            :label="statusLabel[ticket.status ?? 'open'] ?? ticket.status"
                        />
                    </div>
                    <div class="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                        <span v-if="ticket.category" class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-tag" />{{ ticket.category }}
                        </span>
                        <span class="flex items-center gap-1.5">
                            <UIcon name="i-lucide-calendar" />
                            Opened {{ new Date(ticket.date_created!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                        </span>
                    </div>
                </UCard>

                <!-- Messages thread -->
                <div class="max-w-3xl mx-auto mb-8">

                    <div class="flex justify-end items-center gap-3 mb-3">
                        <UButton
                            :icon="timelineReversed ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-narrow-wide'"
                            :label="timelineReversed ? 'Oldest first' : 'Newest first'"
                            color="neutral"
                            variant="ghost"
                            size="sm"
                            @click="timelineReversed = !timelineReversed"
                        />
                    </div>

                    <div v-if="!messages.length" class="text-center text-muted py-8">
                        No messages yet.
                    </div>
                    
                    <UTimeline
                        v-else
                        :items="messages.map(m => ({
                            ...m,
                            date: m.date_created ?? undefined,
                            icon: m.sender_role === 'customer' ? 'i-lucide-user' : 'i-lucide-headset',
                            color: m.sender_role === 'customer' ? 'accent' : 'neutral',
                        }))"
                        size="xs"
                        :ui="{
                            date: 'float-end ms-1',
                            description: 'px-3 py-2 ring ring-default mt-2 rounded-md text-default'
                        }"
                    >
                        <template #title="{ item }">
                            <span class="font-medium">{{ item.sender_role === 'customer' ? 'You' : 'Support' }}</span>
                        </template>
                        <template #date="{ item }">
                            {{ item.date_created ? new Date(item.date_created).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '' }}
                        </template>

                        <template #description="{ item }">
                            <p class="whitespace-pre-wrap text-sm">{{ item.message }}</p>
                            <div v-if="(item.files as any[])?.length" class="mt-2 space-y-1 border-t border-default pt-2">
                                <a
                                    v-for="f in (item.files as any[])"
                                    :key="f.id"
                                    :href="`/api/support/file?id=${f.file?.id}`"
                                    target="_blank"
                                    class="flex items-center gap-2 text-xs rounded px-2 py-1 bg-muted hover:bg-elevated transition-colors"
                                >
                                    <UIcon name="i-lucide-paperclip" class="shrink-0" />
                                    <span class="truncate">{{ f.file?.filename_download }}</span>
                                    <span class="text-muted shrink-0">{{ formatFileSize(f.file?.filesize) }}</span>
                                </a>
                            </div>
                        </template>
                    </UTimeline>
                </div>

                <!-- Reply form -->
                <UCard
                    v-if="ticket.status !== 'closed'"
                    class="max-w-3xl mx-auto ring-1 ring-accent/20"
                >
                    <div class="flex items-center gap-3 mb-3">
                        <p class="font-medium">Reply</p>
                        <Transition name="hint">
                            <div v-if="showScrollHint" class="flex items-center gap-1 text-xs text-accent font-medium">
                                <UIcon name="i-lucide-arrow-up" class="animate-bounce" />
                                New message at top
                            </div>
                        </Transition>
                    </div>

                    <UTextarea
                        v-model="messageText"
                        placeholder="Type your message..."
                        :rows="4"
                        class="w-full mb-3"
                    />

                    <!-- Pending attachments -->
                    <div v-if="attachments.length" class="flex flex-wrap gap-2 mb-3">
                        <div
                            v-for="(file, i) in attachments"
                            :key="i"
                            class="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1"
                        >
                            <UIcon name="i-lucide-paperclip" class="shrink-0" />
                            <span class="truncate max-w-36">{{ file.name }}</span>
                            <span class="text-muted">{{ formatFileSize(file.size) }}</span>
                            <button type="button" @click="removeAttachment(i)" class="ml-1 text-muted hover:text-red-500 transition-colors">
                                <UIcon name="i-lucide-x" />
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center justify-between gap-3">
                        <UButton
                            icon="i-lucide-paperclip"
                            color="neutral"
                            variant="ghost"
                            label="Attach files"
                            @click="fileInput?.click()"
                        />
                        <input
                            ref="fileInput"
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,application/pdf"
                            class="hidden"
                            @change="onFileChange"
                        />
                        <UButton
                            label="Send"
                            color="accent"
                            trailing-icon="i-lucide-send"
                            :loading="submitting"
                            :disabled="!messageText.trim()"
                            @click="submitReply"
                        />
                    </div>
                </UCard>

                <p v-else class="max-w-3xl mx-auto text-center text-muted text-sm py-4">
                    This ticket is closed.
                </p>

            </template>

            <div v-else class="text-center py-16 text-muted">
                Ticket not found.
            </div>

        </Container>
    </div>
</template>

<style scoped>
.hint-enter-active, .hint-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}
.hint-enter-from, .hint-leave-to {
    opacity: 0;
    transform: translateY(4px);
}
</style>
