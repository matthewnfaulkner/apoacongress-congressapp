import type { H3Event } from 'h3';
import type { ManageTicketsResponse, ManagedAddOn, ManagedPlace, ManagedRegistration } from '../../../../../app/types/manage-tickets';

type TicketRow = {
	id: string;
	status: 'valid' | 'voided' | null;
	ticket_type: {
		id: string;
		name: string | null;
		charge: { registration_type: 'delegate' | 'accompanying' | null } | null;
	} | null;
	registration: {
		id: string;
		status: ManagedRegistration['status'];
		title: string | null;
		first_name: string | null;
		last_name: string | null;
		email: string | null;
		host_registration: string | null;
		delegate_no: string | null;
		badge_type: { name: string; prefix: string } | null;
	} | null;
};

/**
 * Data for the buyer's "Manage tickets" page: who each place in this order
 * is for, which companions go with whom, and which attendee each add-on
 * belongs to. Directus only — Ticket Tailor's holder details aren't used.
 *
 * Read with the bot token once requireBuyerOfOrder has passed.
 *
 * Deliberately NOT returned: needs_review / review_reason. A duplicate-email
 * reason reads "Same email as <name>", which would show the buyer the name
 * of someone outside their order.
 */
export default defineEventHandler(async (event: H3Event): Promise<ManageTicketsResponse> => {
	const config = useRuntimeConfig();
	const orderId = getRouterParam(event, 'id');

	if (!orderId) {
		throw createError({ statusCode: 400, statusMessage: 'orderId is required' });
	}

	const order = await requireBuyerOfOrder(event, orderId);
	const { tt_bypass_id: bypassTicketTypeId } = await getCongressConfig();

	const rows = await directusServer.request<TicketRow[]>(
		withToken(
			config.directusOrderBotToken as string,
			readItems('congress_issued_tickets', {
				filter: { order: { _eq: order.id } },
				fields: [
					'id',
					'status',
					{ ticket_type: ['id', 'name', { charge: ['registration_type'] }] },
					{
						registration: [
							'id', 'status', 'title', 'first_name', 'last_name', 'email',
							'host_registration', 'delegate_no', { badge_type: ['name', 'prefix'] },
						],
					},
				],
				sort: ['id'],
				limit: -1,
			} as any),
		),
	);

	// Voided tickets are gone as far as the buyer is concerned; the bypass
	// ticket is an internal stand-in (see getCongressConfig), not a purchase.
	const tickets = rows.filter((row) => row.status !== 'voided' && row.ticket_type?.id !== bypassTicketTypeId);

	const places: ManagedPlace[] = [];
	const companions: ManagedPlace[] = [];
	const addOns: ManagedAddOn[] = [];

	for (const ticket of tickets) {
		const kind = ticket.ticket_type?.charge?.registration_type ?? null;
		const ticketName = ticket.ticket_type?.name ?? null;

		if (kind) {
			const place: ManagedPlace = {
				ticket_id: ticket.id,
				ticket_name: ticketName,
				kind,
				registration: ticket.registration ? toManagedRegistration(ticket.registration) : null,
			};
			(kind === 'accompanying' ? companions : places).push(place);
		} else {
			addOns.push({
				ticket_id: ticket.id,
				ticket_name: ticketName,
				registration: ticket.registration?.id ?? null,
				registration_name: ticket.registration ? fullName(ticket.registration) : null,
			});
		}
	}

	// Unattached add-ons first (the ones needing action); otherwise keep the
	// order from the query.
	addOns.sort((a, b) => Number(a.registration !== null) - Number(b.registration !== null));

	return {
		order_id: order.id,
		can_change: canChangeAssignments(order.congress),
		places,
		companions,
		add_ons: addOns,
	};
});

function toManagedRegistration(row: NonNullable<TicketRow['registration']>): ManagedRegistration {
	return {
		id: row.id,
		status: row.status,
		title: row.title,
		first_name: row.first_name,
		last_name: row.last_name,
		email: row.email,
		host_registration: row.host_registration,
		delegate_label: row.delegate_no ? `${row.badge_type?.prefix ?? ''}${row.delegate_no}` : null,
		badge_type_name: row.badge_type?.name ?? null,
	};
}

function fullName(row: { first_name: string | null; last_name: string | null }): string | null {
	return [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
}
