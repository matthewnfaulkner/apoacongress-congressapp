import type { H3Event } from 'h3';

const MAX_LENGTH = 255;

/**
 * The attendee edits their own details on My registration: badge name,
 * organisation, city, country. Nothing else — names/email belong to the
 * buyer's assignment (Manage tickets), and badge type / delegate number
 * are Directus's.
 *
 * Written with the bot token, so the attendee match is the only gate.
 *
 * Not gated on canChangeAssignments: that cutoff is about who a place is
 * for, not the attendee's own badge details. Add a separate cutoff here if
 * badge printing needs one.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();
	const botToken = config.directusOrderBotToken as string;
	const registrationId = getRouterParam(event, 'id');

	if (!registrationId) {
		throw createError({ statusCode: 400, statusMessage: 'id is required' });
	}

	const identity = await requireCallerIdentity(event);
	const notFound = () => createError({ statusCode: 404, statusMessage: 'Registration not found' });

	let registration: { id: string; status: string; user: string | null; email: string | null; congress: { site: string | null } | null };
	try {
		registration = await directusServer.request<typeof registration>(
			withToken(
				botToken,
				readItem('congress_registrations', registrationId, { fields: ['id', 'status', 'user', 'email', { congress: ['site'] }] } as any),
			),
		);
	} catch {
		throw notFound();
	}

	if (!registration || registration.congress?.site !== config.public.siteId || !isAttendee(identity, registration)) {
		throw notFound();
	}
	if (registration.status === 'cancelled') {
		throw createError({ statusCode: 409, statusMessage: 'This registration has been cancelled.' });
	}

	const body = (await readBody<Record<string, unknown>>(event)) ?? {};
	const update = {
		badge_name: text(body.badge_name),
		organisation_name: text(body.organisation_name),
		city: text(body.city),
		country: text(body.country),
	};

	if (Object.values(update).some((value) => value && value.length > MAX_LENGTH)) {
		throw createError({ statusCode: 400, statusMessage: `Each field can be at most ${MAX_LENGTH} characters.` });
	}

	await directusServer.request(withToken(botToken, updateItem('congress_registrations', registrationId, update as any)));

	return { success: true };
});

function text(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}
