import type { H3Event } from 'h3';

type TicketRow = {
	id: string;
	order: string | null;
	status: 'valid' | 'voided' | null;
	ticket_type: { id: string; charge: { registration_type: 'delegate' | 'accompanying' | null } | null } | null;
};

/**
 * The buyer attaches one of their order's add-on tickets to an attendee in
 * the same order, or moves it to another (Manage tickets page). Writes
 * congress_issued_tickets.registration only — Ticket Tailor's holder fields
 * on the ticket are left as they are.
 *
 * Can't be set back to "nobody" (agreed): it only moves between attendees.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const botToken = config.directusOrderBotToken as string;
	const orderId = getRouterParam(event, 'id');
	const ticketId = getRouterParam(event, 'ticketId');

	if (!orderId || !ticketId) {
		throw createError({ statusCode: 400, statusMessage: 'orderId and ticketId are required' });
	}

	const order = await requireBuyerOfOrder(event, orderId);
	requireAssignmentsOpen(order.congress);

	const body = (await readBody<{ registration?: unknown }>(event)) ?? {};
	const registrationId = typeof body.registration === 'string' && body.registration ? body.registration : null;

	if (!registrationId) {
		throw createError({ statusCode: 400, statusMessage: 'Choose who this ticket is for.' });
	}

	const notFound = () => createError({ statusCode: 404, statusMessage: 'Ticket not found in this order' });

	let ticket: TicketRow;
	try {
		ticket = await directusServer.request<TicketRow>(
			withToken(
				botToken,
				readItem('congress_issued_tickets', ticketId, {
					fields: ['id', 'order', 'status', { ticket_type: ['id', { charge: ['registration_type'] }] }],
				} as any),
			),
		);
	} catch {
		throw notFound();
	}

	const { tt_bypass_id: bypassTicketTypeId } = await getCongressConfig();

	if (!ticket || ticket.order !== order.id || ticket.ticket_type?.id === bypassTicketTypeId) {
		throw notFound();
	}
	if (ticket.ticket_type?.charge?.registration_type) {
		throw createError({ statusCode: 400, statusMessage: 'Admission tickets can\'t be moved — change who the place is for instead.' });
	}
	if (ticket.status === 'voided') {
		throw createError({ statusCode: 409, statusMessage: 'This ticket has been cancelled.' });
	}

	const target = (await loadOrderAdmissions(order.id)).get(registrationId);
	if (!target || target.status === 'cancelled') {
		throw createError({ statusCode: 400, statusMessage: 'Choose an attendee from this order.' });
	}

	await directusServer.request(withToken(botToken, updateItem('congress_issued_tickets', ticketId, { registration: registrationId } as any)));

	return { success: true };
});
