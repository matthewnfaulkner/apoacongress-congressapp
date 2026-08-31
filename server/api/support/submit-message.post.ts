export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const TOKEN = config.directusSupportUserToken as string;

    if (!TOKEN) {
        throw createError({ statusCode: 500, statusMessage: 'DIRECTUS_SUPPORT_USER_TOKEN is not defined.' });
    }

    // No static-token fallback: replying to a support case always requires a
    // real, verified session — same pattern as get-ticket.get.ts.
    const cookies = parseCookies(event);
    const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
    const sessionToken = bearerToken ?? cookies[config.sessionTokenName as string] ?? null;

    if (!sessionToken) {
        throw createError({ statusCode: 401, statusMessage: 'You must be logged in to reply to a support case.' });
    }

    let currentUser: { id: string; email?: string | null };
    try {
        currentUser = await directusServer.request<{ id: string; email?: string | null }>(
            withToken(sessionToken, readMe({ fields: ['id', 'email'] })),
        );
    } catch {
        throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session.' });
    }

    const formData = await readMultipartFormData(event);
    if (!formData) {
        throw createError({ statusCode: 400, statusMessage: 'No data received.' });
    }

    const get = (name: string) => formData.find(f => f.name === name)?.data?.toString() ?? '';

    const ticketId = get('ticketId');
    const message = get('message');
    const folder = get('folder');

    if (!ticketId || !message) {
        throw createError({ statusCode: 400, statusMessage: 'ticketId and message are required.' });
    }

    // Ownership check: customers can't read support_cases directly (hence the
    // privileged TOKEN here), so this has to fetch with it and then verify the
    // case actually belongs to the authenticated caller before writing
    // anything - sender/sender_email below come from the verified session,
    // never from the client, for the same reason.
    let ticket: { customer?: string | { id: string } | null };
    try {
        ticket = await directusServer.request<{ customer?: string | { id: string } | null }>(
            withToken(TOKEN, readItem('support_cases' as any, ticketId, { fields: ['customer'] })),
        );
    } catch {
        throw createError({ statusCode: 404, statusMessage: 'Ticket not found.' });
    }

    const customerId = typeof ticket.customer === 'object' ? ticket.customer?.id : ticket.customer;
    if (customerId !== currentUser.id) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden.' });
    }

    const fileIds: string[] = [];
    const fileParts = formData.filter(f => f.name === 'file' && f.filename);
    for (const part of fileParts) {
        const blob = new Blob([part.data], { type: part.type ?? 'application/octet-stream' });
        const uploadFormData = new FormData();
        uploadFormData.append('storage', 's3');
        if (folder) uploadFormData.append('folder', folder);
        uploadFormData.append('file', blob, part.filename!);

        try {
            const uploaded = await directusServer.request(
                withToken(TOKEN, uploadFiles(uploadFormData))
            ) as { id?: string };
            if (uploaded?.id) fileIds.push(uploaded.id);
        } catch (e) {
            console.error('File upload failed:', e);
            throw createError({ statusCode: 500, statusMessage: 'File upload failed.' });
        }
    }

    const payload: Record<string, unknown> = {
        case: ticketId,
        sender: currentUser.id,
        sender_role: 'customer',
        sender_email: currentUser.email,
        message,
        ...(fileIds.length > 0 && {
            files: fileIds.map(id => ({ file: id })),
        }),
    };

    try {
        const newMessage = await directusServer.request(withToken(TOKEN, createItem('case_messages', payload)));
        return newMessage;
    } catch (e: any) {
        if (e.statusCode) throw e;
        console.error('Message creation failed:', e);
        throw createError({ statusCode: 500, statusMessage: 'Failed to create message.' });
    }
});
