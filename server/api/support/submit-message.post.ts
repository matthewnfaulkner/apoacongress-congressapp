import { createDirectus, rest, withToken, uploadFiles, createItem } from '@directus/sdk';

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const TOKEN = config.directusSupportUserToken as string;

    if (!TOKEN) {
        throw createError({ statusCode: 500, statusMessage: 'DIRECTUS_SERVER_TOKEN is not defined.' });
    }

    const formData = await readMultipartFormData(event);
    if (!formData) {
        throw createError({ statusCode: 400, statusMessage: 'No data received.' });
    }

    const get = (name: string) => formData.find(f => f.name === name)?.data?.toString() ?? '';

    const ticketId = get('ticketId');
    const userId = get('userId');
    const userEmail = get('userEmail');
    const message = get('message');
    const folder = get('folder');

    if (!ticketId || !message) {
        throw createError({ statusCode: 400, statusMessage: 'ticketId and message are required.' });
    }

    const serverDirectus = createDirectus(config.public.directusUrl as string).with(rest());

    const fileIds: string[] = [];
    const fileParts = formData.filter(f => f.name === 'file' && f.filename);
    for (const part of fileParts) {
        const blob = new Blob([part.data], { type: part.type ?? 'application/octet-stream' });
        const uploadFormData = new FormData();
        uploadFormData.append('storage', 's3');
        if (folder) uploadFormData.append('folder', folder);
        uploadFormData.append('file', blob, part.filename!);

        try {
            const uploaded = await serverDirectus.request(
                withToken(TOKEN, uploadFiles(uploadFormData))
            ) as { id?: string };
            if (uploaded?.id) fileIds.push(uploaded.id);
        } catch (e) {
            console.error('File upload failed:', e);
            throw createError({ statusCode: 500, statusMessage: 'File upload failed.' });
        }
    }

    const payload: Record<string, unknown> = {
        case: { id: ticketId, customer: userId },
        sender: userId,
        sender_role: 'customer',
        sender_email: userEmail,
        message,
        ...(fileIds.length > 0 && {
            files: fileIds.map(id => ({ file: id })),
        }),
    };

    try {
        const newMessage = await serverDirectus.request(withToken(TOKEN, createItem('case_messages', payload)));
        return newMessage;
    } catch (e) {
        console.error('Message creation failed:', e);
        throw createError({ statusCode: 500, statusMessage: 'Failed to create message.' });
    }
});
