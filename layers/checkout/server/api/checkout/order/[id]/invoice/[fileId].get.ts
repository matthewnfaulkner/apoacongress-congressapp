import type { H3Event } from 'h3';

/**
 * Streams a single invoice PDF (congress_orders.invoices, an M2M to
 * directus_files — see the generate_invoice / Generate PDF operations on the
 * Ticket Tailor webhook flow) back to the customer who owns the order.
 *
 * Deliberately not exposed via direct Directus permissions on
 * directus_files — a folder-scoped permission can't distinguish "my own
 * invoice" from "any invoice in this folder", and does nothing at all for
 * guest customers, who have no Directus user account to grant permissions
 * to in the first place (see getCheckoutEmailSession). Ownership is instead
 * checked here the same way order.get.ts does, then the file is fetched
 * with the bot token and proxied straight through.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const orderId = getRouterParam(event, 'id');
	const fileId = getRouterParam(event, 'fileId');

	if (!orderId || !fileId) {
		throw createError({ statusCode: 400, statusMessage: 'orderId and fileId are required' });
	}

	if (!(await verifyOrderOwnership(event, orderId))) {
		throw createError({ statusCode: 404, statusMessage: 'Not found' });
	}

	// Confirms fileId actually belongs to this order rather than trusting it
	// outright — an owner of order A shouldn't be able to read order B's
	// invoice just by guessing/enumerating its file id in the URL.
	const junctionRows = await directusServer.request<Array<{ id: number }>>(
		withToken(
			config.directusOrderBotToken as string,
			readItems('congress_orders_files' as any, {
				filter: {
					congress_orders_id: { _eq: orderId },
					directus_files_id: { _eq: fileId },
				} as any,
				fields: ['id'],
				limit: 1,
			}),
		),
	);

	if (junctionRows.length === 0) {
		throw createError({ statusCode: 404, statusMessage: 'Not found' });
	}

	const file = await directusServer.request<{ type: string | null; filename_download: string }>(
		withToken(config.directusOrderBotToken as string, readFile(fileId, { fields: ['type', 'filename_download'] } as any)),
	);

	const asset = await $fetch.raw(`${config.public.directusUrl}/assets/${fileId}`, {
		headers: { Authorization: `Bearer ${config.directusOrderBotToken}` },
		responseType: 'arrayBuffer',
	});

	setResponseHeader(event, 'Content-Type', file.type ?? 'application/pdf');
	setResponseHeader(event, 'Content-Disposition', `inline; filename="${file.filename_download}"`);
	// H3 only sends raw bytes correctly for a Buffer — returning the ArrayBuffer
	// itself gets treated as a plain object and JSON-serialized instead,
	// corrupting the PDF (this is what "Failed to load PDF document" was).
	return Buffer.from(asset._data as ArrayBuffer);
});
