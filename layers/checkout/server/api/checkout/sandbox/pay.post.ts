import type { H3Event } from 'h3';

type Outcome = 'pending' | 'completed' | 'failed';

type Body = {
	bundleId?: unknown;
	outcome?: unknown;
	guestToken?: unknown;
	buyer?: { first_name?: unknown; last_name?: unknown; email?: unknown } | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * SANDBOX ONLY — stands in for paying on Ticket Tailor's hosted checkout
 * (payment.vue shows CheckoutSandboxPayment instead of the widget).
 *
 *  - failed:    nothing is created, like a declined payment.
 *  - pending:   bank transfer — order created as pending.
 *  - completed: instant payment — order created as completed.
 *
 * The order itself is made by the Directus flow "Ticket Tailor (sandbox) →
 * Create order": it saves a Ticket Tailor-shaped order to
 * ticket_tailor_orders and forwards it, signed, to "Ticket Tailor -> New
 * Order" exactly like Ticket Tailor's own webhook. So congress_orders,
 * invoices and registrations all come from the real ingestion path.
 *
 * Gate: the caller must own the bundle's checkout claim
 * (congress_order_owners) — the logged-in account that made it, or the
 * guest token bundle.post.ts handed out.
 */
export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig();

	if (!config.public.isSandbox) {
		throw createError({ statusCode: 404, statusMessage: 'Not found' });
	}

	const body = (await readBody<Body>(event)) ?? {};
	const bundleId = typeof body.bundleId === 'string' ? body.bundleId : null;
	const outcome = body.outcome as Outcome;

	if (!bundleId || !['pending', 'completed', 'failed'].includes(outcome)) {
		throw createError({ statusCode: 400, statusMessage: 'bundleId and a valid outcome are required' });
	}

	const owners = await directusServer.request<Array<{ user: string | null; token: string | null; submission: string | null }>>(
		withToken(
			config.directusOrderBotToken as string,
			readItems('congress_order_owners', {
				filter: { bundle_id: { _eq: bundleId } },
				fields: ['user', 'token', 'submission'],
				limit: 1,
			} as any),
		),
	);
	const owner = owners[0];

	const userId = await getCheckoutUserId(event);
	const guestToken = typeof body.guestToken === 'string' ? body.guestToken : null;
	const isOwner = Boolean(owner) && (
		(userId !== null && owner!.user === userId)
		|| (owner!.token !== null && guestToken !== null && owner!.token === guestToken)
	);

	if (!isOwner) {
		throw createError({ statusCode: 404, statusMessage: 'Checkout not found' });
	}

	if (outcome === 'failed') {
		return { outcome, orderId: null };
	}

	// Ticket Tailor's own checkout asks for the buyer's name and email; here
	// they come from the sandbox panel, falling back to this checkout's form
	// or the logged-in profile (same order bundle.post.ts prefills from).
	const known = (await getFormSubmissionContactDetails(owner!.submission)) ?? (await getCheckoutContactDetails(event));
	const buyer = {
		first_name: text(body.buyer?.first_name) ?? known?.firstName ?? '',
		last_name: text(body.buyer?.last_name) ?? known?.lastName ?? '',
		email: (text(body.buyer?.email) ?? known?.email ?? '').toLowerCase(),
	};

	if (!EMAIL_PATTERN.test(buyer.email)) {
		throw createError({ statusCode: 400, statusMessage: 'Enter the buyer\'s email.' });
	}

	const { tt_event_id: eventId } = await getCongressConfig();

	const order = await callTicketTailorSandboxFlow<{ id: string; status: string }>('order', {
		bundle_id: bundleId,
		status: outcome,
		event_id: eventId,
		buyer,
	});

	return { outcome, orderId: order.id };
});

function text(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}
