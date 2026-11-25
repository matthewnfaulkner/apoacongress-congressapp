import { createHash, createHmac } from 'crypto';

// Only Flows named with this prefix can be run by a decision request - stops a
// definition from pointing a link at an unrelated Flow (e.g. a send-email utility).
export const DECISION_FLOW_PREFIX = 'Decision Request ->';

export interface DecisionOption {
	value: string;
	label: string;
	message: string;
}

export interface DecisionRequestRow {
	id: string;
	recipient_user: string | null;
	recipient_email: string | null;
	chosen_option: string | null;
	expires_at: string | null;
	superseded_at: string | null;
	definition: {
		id: string;
		allow_change: boolean | null;
		options: DecisionOption[] | null;
		flow: {
			id: string;
			name: string | null;
			status: string | null;
			trigger: string | null;
			options: { method?: string; async?: boolean } | null;
		} | null;
	} | null;
}

// The link only ever carries the raw token; Directus stores sha256(token) as
// hex, so a leaked database row can't be turned back into a working link.
export function hashDecisionToken(token: string) {
	return createHash('sha256').update(token, 'utf8').digest('hex');
}

// Matches Utils -> Verify Webhook: hex HMAC-SHA256 of the exact raw request
// body, sent as x-flow-signature (verified against the cryptography operation's
// own implementation, which produces the same output as Node's createHmac).
export function signFlowBody(body: string, secret: string) {
	return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}
