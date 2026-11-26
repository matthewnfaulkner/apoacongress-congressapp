import type { H3Event } from 'h3';
import type { PersonInput } from '../../../../../utils/registration-person';

type CompanionRow = {
	id: string;
	status: 'pending' | 'confirmed' | 'cancelled';
	congress: string;
	host_registration: { id: string; status: string; user: string | null; email: string | null; congress: { site: string | null } | null } | null;
};

/**
 * A delegate edits the details of someone accompanying them (My
 * registrations): title, names, optional email. Same save rules as the
 * buyer's Manage tickets (savePerson). The host stays as it is.
 *
 * Gate (bot token, so this is the only one): the caller is the attendee of
 * the host registration `:id`, the companion really is that registration's
 * companion, neither is cancelled, and assignments are still open.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const hostId = getRouterParam(event, 'id');
	const companionId = getRouterParam(event, 'companionId');

	if (!hostId || !companionId) {
		throw createError({ statusCode: 400, statusMessage: 'id and companionId are required' });
	}

	const identity = await requireCallerIdentity(event);
	const notFound = () => createError({ statusCode: 404, statusMessage: 'Accompanying person not found' });

	let companion: CompanionRow;
	try {
		companion = await directusServer.request<CompanionRow>(
			withToken(
				config.directusOrderBotToken as string,
				readItem('congress_registrations', companionId, {
					fields: ['id', 'status', 'congress', { host_registration: ['id', 'status', 'user', 'email', { congress: ['site'] }] }],
				} as any),
			),
		);
	} catch {
		throw notFound();
	}

	const host = companion?.host_registration;
	if (!host || host.id !== hostId || host.congress?.site !== config.public.siteId || !isAttendee(identity, host)) {
		throw notFound();
	}
	if (companion.status === 'cancelled' || host.status === 'cancelled') {
		throw createError({ statusCode: 409, statusMessage: 'This registration has been cancelled and can no longer be changed.' });
	}

	requireAssignmentsOpen(companion.congress);

	const next = validatePerson('accompanying', (await readBody<PersonInput>(event)) ?? ({} as PersonInput));
	await savePerson(companion.congress, companionId, next);

	return { success: true };
});
