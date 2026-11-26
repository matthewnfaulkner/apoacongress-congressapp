import { $fetch } from 'ofetch';

const INVALID_LINK = 'This link has expired or is no longer valid.';
const GENERIC_FAILURE = 'Sorry, we couldn\'t record your response. Please try again later.';

// Refusals carry the message to show in `data.message` rather than
// statusMessage, which h3 strips down to plain ASCII.
function refuse(statusCode: number, message: string) {
	return createError({ statusCode, statusMessage: 'Decision refused', data: { message } });
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	const TOKEN = config.directusDecisionBotToken as string;
	const signingSecret = config.flowSigningSecret as string;

	if (!TOKEN || !signingSecret) {
		console.error('Decision requests need DIRECTUS_DECISION_BOT_TOKEN and DIRECTUS_FLOW_SIGNING_SECRET to be set.');
		throw refuse(500, GENERIC_FAILURE);
	}

	const token = getRouterParam(event, 'token') ?? '';
	const option = getRouterParam(event, 'option') ?? '';

	if (!/^[A-Za-z0-9_-]{20,128}$/.test(token) || !/^[a-z0-9_-]{1,64}$/.test(option)) {
		throw refuse(404, INVALID_LINK);
	}

	const [request] = (await directusServer.request(
		withToken(TOKEN, readItems('decision_requests' as any, {
			filter: { token_hash: { _eq: hashDecisionToken(token) } },
			fields: [
				'id', 'recipient_user', 'recipient_email', 'chosen_option', 'expires_at', 'superseded_at',
				{ definition: ['id', 'allow_change', 'options', { flow: ['id', 'name', 'status', 'trigger', 'options'] }] },
			] as any,
			limit: 1,
		})),
	)) as DecisionRequestRow[];

	const definition = request?.definition;
	const expiresAt = request?.expires_at ? Date.parse(request.expires_at) : NaN;

	if (!request || !definition || request.superseded_at || !(expiresAt > Date.now())) {
		throw refuse(410, INVALID_LINK);
	}

	const options = Array.isArray(definition.options) ? definition.options : [];
	const chosen = options.find((o) => o.value === option);

	if (!chosen) {
		throw refuse(404, INVALID_LINK);
	}

	// Same answer clicked again (or the page reloaded) - nothing to do.
	if (request.chosen_option === option) {
		return { ok: true, message: chosen.message };
	}

	if (request.chosen_option && definition.allow_change === false) {
		const previous = options.find((o) => o.value === request.chosen_option);
		throw refuse(409, `You've already chosen: ${previous?.label ?? request.chosen_option}`);
	}

	const flow = definition.flow;
	if (
		!flow?.name?.startsWith(DECISION_FLOW_PREFIX)
		|| flow.status !== 'active'
		|| flow.trigger !== 'webhook'
		|| flow.options?.method !== 'POST'
		|| flow.options?.async
	) {
		console.error(`Decision definition ${definition.id} has no usable Flow: it must be an active, synchronous POST webhook Flow named "${DECISION_FLOW_PREFIX} …".`);
		throw refuse(500, GENERIC_FAILURE);
	}

	// Signed as an exact string - Verify Webhook hashes the raw body it receives.
	// No record is passed: each decision Flow finds what to change from the
	// recipient itself.
	const body = JSON.stringify({
		decision_request: request.id,
		option,
		previous_option: request.chosen_option ?? null,
		recipient_user: request.recipient_user,
		recipient_email: request.recipient_email,
		sent_at: new Date().toISOString(),
	});

	let result: { ok?: unknown; message?: unknown } | null;
	try {
		result = await $fetch(`${config.public.directusUrl}/webhook-raw-trigger/trigger/${flow.id}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-flow-signature': signFlowBody(body, signingSecret),
			},
			body,
		});
	} catch (e) {
		console.error(`Decision Flow ${flow.id} failed:`, e);
		throw refuse(502, GENERIC_FAILURE);
	}

	if (result?.ok !== true) {
		throw refuse(422, typeof result?.message === 'string' && result.message ? result.message : GENERIC_FAILURE);
	}

	try {
		await directusServer.request(
			withToken(TOKEN, updateItem('decision_requests' as any, request.id, {
				chosen_option: option,
				decided_at: new Date().toISOString(),
			}, { fields: ['id'] })),
		);
	} catch (e) {
		// The Flow has already acted at this point, so this needs fixing by hand -
		// the row just doesn't show the choice yet.
		console.error(`Decision Flow ${flow.id} succeeded but saving the choice on decision request ${request.id} failed:`, e);
		throw refuse(500, GENERIC_FAILURE);
	}

	return { ok: true, message: chosen.message };
});
