import type { H3Event } from 'h3';
import type { MyRegistration, MyRegistrationTicket } from '../../../app/types/my-registrations';

type NameRow = { first_name: string | null; last_name: string | null; status?: string | null };

type RegistrationRow = {
	id: string;
	status: 'pending' | 'confirmed' | 'cancelled';
	user: string | null;
	title: string | null;
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	delegate_no: string | null;
	badge_type: { name: string; prefix: string } | null;
	badge_name: string | null;
	organisation_name: string | null;
	city: string | null;
	country: string | null;
	congress: string;
	host_registration: NameRow | null;
	accompanying: Array<NameRow & { id: string; title: string | null; email: string | null }> | null;
	tickets: Array<{
		id: string;
		status: 'valid' | 'voided' | null;
		ticket_type: { id: string; name: string | null; charge: { registration_type: 'delegate' | 'accompanying' | null } | null } | null;
	}> | null;
};

/**
 * The attendee's own registrations on this site: matched by
 * registration.user = their account, or registration.email = their
 * verified login-link email. Cancelled ones aren't shown.
 *
 * Read with the bot token (an email-link attendee has no account), so the
 * match below is the only gate.
 */
export default defineEventHandler(async (event: H3Event): Promise<MyRegistration[]> => {
	const config = useRuntimeConfig();
	const identity = await requireCallerIdentity(event);
	const { tt_bypass_id: bypassTicketTypeId } = await getCongressConfig();

	const rows = await directusServer.request<RegistrationRow[]>(
		withToken(
			config.directusOrderBotToken as string,
			readItems('congress_registrations', {
				filter: { ...attendeeRegistrationsFilter(identity), status: { _neq: 'cancelled' } },
				fields: [
					'id', 'status', 'user', 'congress', 'title', 'first_name', 'last_name', 'email', 'delegate_no',
					{ badge_type: ['name', 'prefix'] },
					'badge_name', 'organisation_name', 'city', 'country',
					{ host_registration: ['first_name', 'last_name'] },
					{ accompanying: ['id', 'title', 'first_name', 'last_name', 'email', 'status'] },
					{ tickets: ['id', 'status', { ticket_type: ['id', 'name', { charge: ['registration_type'] }] }] },
				],
				sort: ['id'],
				limit: -1,
			} as any),
		),
	);

	return rows
		.filter((row) => isAttendee(identity, row))
		.map((row): MyRegistration => {
			const tickets: Array<MyRegistrationTicket & { kindOrder: number }> = (row.tickets ?? [])
				.filter((ticket) => ticket.status !== 'voided' && ticket.ticket_type?.id !== bypassTicketTypeId)
				.map((ticket) => {
					const admission = Boolean(ticket.ticket_type?.charge?.registration_type);
					return {
						id: ticket.id,
						name: ticket.ticket_type?.name ?? null,
						kind: admission ? 'admission' : 'add-on',
						kindOrder: admission ? 0 : 1,
					};
				});
			tickets.sort((a, b) => a.kindOrder - b.kindOrder);

			const admissionKind = (row.tickets ?? []).find((t) => t.status !== 'voided' && t.ticket_type?.charge?.registration_type)
				?.ticket_type?.charge?.registration_type ?? null;

			return {
				id: row.id,
				status: row.status as MyRegistration['status'],
				kind: admissionKind,
				title: row.title,
				first_name: row.first_name,
				last_name: row.last_name,
				email: row.email,
				delegate_label: row.delegate_no ? `${row.badge_type?.prefix ?? ''}${row.delegate_no}` : null,
				badge_type_name: row.badge_type?.name ?? null,
				badge_name: row.badge_name,
				organisation_name: row.organisation_name,
				city: row.city,
				country: row.country,
				host_name: row.host_registration ? fullName(row.host_registration) : null,
				companions: (row.accompanying ?? [])
					.filter((companion) => companion.status !== 'cancelled')
					.map((companion) => ({
						id: companion.id,
						title: companion.title,
						first_name: companion.first_name,
						last_name: companion.last_name,
						email: companion.email,
					})),
				can_change: canChangeAssignments(row.congress),
				tickets: tickets.map(({ kindOrder: _kindOrder, ...ticket }) => ticket),
			};
		});
});

function fullName(row: NameRow): string | null {
	return [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
}
