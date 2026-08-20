import type { H3Event } from 'h3';
import { randomBytes } from 'crypto';
import type { TTBundle, TTCreateBundleRequest, TTEvent } from '../../../app/types/ticket-tailor';
import type { BasketLine, CreateBundleRequest, CreateBundleResponse } from '../../../app/types/checkout';
import { checkoutEventOptions, checkoutEventGroups } from '../../../app/utils/checkout-options';

export default defineEventHandler(async (event: H3Event): Promise<CreateBundleResponse> => {
	const config = useRuntimeConfig();
	const body = await readBody<CreateBundleRequest>(event);
	const ticketTailorEventId = await resolveCheckoutEventId();

	const lines: BasketLine[] = (body?.lines ?? []).filter((line) => line?.ticketTypeId && line.quantity > 0);

	if (lines.length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'Basket is empty' });
	}

	// Always re-fetch fresh — this is the security boundary. Client-side isOrderable
	// (from the cached, possibly-stale GET /api/checkout/event) is display-only.
	const ttEvent = await ticketTailorFetch<TTEvent>(`/events/${ticketTailorEventId}`, 'eventRead');
	const enrichmentById = await fetchTicketEnrichment(ttEvent.ticket_types.map((ticketType) => ticketType.id));
	const isMember = await getCheckoutMembership(event);
	// Fetched once here (rather than only inside the add-on branch below) so
	// normalizeCheckoutEvent can also exclude it from allOptions — it must
	// never be a normal, customer-selectable, $0 option regardless of its own
	// Ticket Tailor status (see normalizeCheckoutEvent's docstring).
	const bypassTicketTypeId = await getCongressBypassTicketId();
	const checkoutEvent = applyMembership(normalizeCheckoutEvent(ttEvent, enrichmentById, bypassTicketTypeId), isMember);

	const allOptions = checkoutEventOptions(checkoutEvent);

	for (const line of lines) {
		const option = allOptions.find((candidate) => candidate.id === line.ticketTypeId);

		if (!option) {
			throw createError({ statusCode: 400, statusMessage: `Unknown ticket type: ${line.ticketTypeId}` });
		}

		if (!option.isOrderable) {
			throw createError({ statusCode: 409, statusMessage: `"${option.name}" is no longer available` });
		}

		if (line.quantity < option.minPerOrder || line.quantity > option.maxPerOrder) {
			throw createError({
				statusCode: 400,
				statusMessage: `"${option.name}" must be ordered in quantities of ${option.minPerOrder}-${option.maxPerOrder}`,
			});
		}

		if (line.quantity > option.quantityRemaining) {
			throw createError({ statusCode: 409, statusMessage: `Not enough "${option.name}" remaining` });
		}
	}

	// Ticket Tailor enforces the registration-ticket dependency itself and
	// would reject a registration-less bundle anyway — this just fails fast
	// with a clear message instead of letting the user reach a Ticket Tailor
	// error page with an unpurchasable basket.
	const registrationTicketIds = new Set(
		checkoutEventGroups(checkoutEvent)
			.filter((group) => group.step === 'registration')
			.flatMap((group) => group.options.map((option) => option.id)),
	);

	const hasRegistrationTicket = lines.some((line) => registrationTicketIds.has(line.ticketTypeId));

	// A bundle with no registration line of its own — either rejected outright,
	// or (for a verified add-on to an existing order) paired with the $0
	// stand-in ticket (already fetched above, for the exclusion filter) so
	// Ticket Tailor's own "requires a registration ticket" bundle dependency
	// still passes without charging the customer for a second one.
	if (!hasRegistrationTicket) {
		const isValidAddOn = body?.orderId ? await verifyOrderOwnership(event, body.orderId) : false;

		if (!isValidAddOn) {
			throw createError({
				statusCode: 400,
				statusMessage: 'To checkout you must add a registration package to your basket.',
			});
		}

		if (!bypassTicketTypeId) {
			throw createError({
				statusCode: 500,
				statusMessage: 'No bypass registration ticket is configured for add-on checkouts',
			});
		}
	}

	const price = lines.reduce((sum, line) => {
		const option = allOptions.find((candidate) => candidate.id === line.ticketTypeId)!;
		return sum + option.price * line.quantity;
	}, 0);

	const bookingFee = lines.reduce((sum, line) => {
		const option = allOptions.find((candidate) => candidate.id === line.ticketTypeId)!;
		return sum + option.bookingFee * line.quantity;
	}, 0);

	const description = lines
		.map((line) => {
			const option = allOptions.find((candidate) => candidate.id === line.ticketTypeId)!;
			return `${line.quantity} x ${option.name}`;
		})
		.join(', ');

	// Ticket Tailor never auto-generates an access code when one isn't supplied
	// (confirmed empirically — it comes back null), but the checkout URL this
	// route returns depends on having one, so it's generated here. Their limit
	// is 30 characters (confirmed empirically — a plain UUID is 32 and gets
	// rejected), so this uses 24 hex chars (12 random bytes) instead.
	const accessCode = randomBytes(12).toString('hex');
	// A raw ISO timestamp here read as noisy/unreadable, especially since
	// Ticket Tailor appends this name to every resulting line item — just the
	// numeric date (e.g. "19/08/2026") instead of "2026-08-19T14:32:07.123Z".
	// No longer needs to be parseable for the stale-bundle cleanup flow —
	// that reads congress_order_owners.date_created instead — so it's free
	// to just be readable.
	const formattedDate = new Date().toLocaleDateString('en-GB');
	const bundleRequest: TTCreateBundleRequest = {
		name: `Order ${formattedDate}`,
		description,
		price,
		booking_fee: bookingFee,
		// LOCKED (not ON_SALE) is what actually gates the bundle behind its
		// access_code — confirmed empirically: ON_SALE bundles are orderable by
		// anyone regardless of the code, and HIDDEN bundles are unreachable even
		// with the code (Ticket Tailor's dashboard nulls the code when you set
		// that). LOCKED mirrors the same status ticket_types use for their own
		// access-code-gated tickets.
		status: 'LOCKED',
		access_code: accessCode,
		// The bundle represents exactly one customer-specific basket — never
		// orderable in multiples.
		min_per_order: 1,
		max_per_order: 1,
		ticket_type_ids: {
			...Object.fromEntries(lines.map((line) => [line.ticketTypeId, line.quantity])),
			...(!hasRegistrationTicket && bypassTicketTypeId ? { [bypassTicketTypeId]: 1 } : {}),
		},
	};

	// Ticket Tailor expects application/x-www-form-urlencoded — and despite
	// their own docs showing ticket_type_ids/product_ids as a JSON-object
	// *string* value, that format is silently rejected. The format that
	// actually works (confirmed empirically, contradicts their docs and their
	// own support response) is PHP-style bracket notation with the id as the
	// bracket key: `ticket_type_ids[tt_xxx]=quantity`.
	const form = new URLSearchParams();
	form.set('name', bundleRequest.name);
	form.set('description', bundleRequest.description);
	form.set('price', String(bundleRequest.price));
	if (bundleRequest.booking_fee) form.set('booking_fee', String(bundleRequest.booking_fee));
	if (bundleRequest.status) form.set('status', bundleRequest.status);
	if (bundleRequest.access_code) form.set('access_code', bundleRequest.access_code);
	if (bundleRequest.min_per_order) form.set('min_per_order', String(bundleRequest.min_per_order));
	if (bundleRequest.max_per_order) form.set('max_per_order', String(bundleRequest.max_per_order));
	for (const [ticketTypeId, quantity] of Object.entries(bundleRequest.ticket_type_ids)) {
		form.set(`ticket_type_ids[${ticketTypeId}]`, String(quantity));
	}

	let bundle: TTBundle;
	try {
		bundle = await ticketTailorFetch<TTBundle>(`/event_series/${ttEvent.event_series_id}/bundles`, 'bundleCreate', {
			method: 'POST',
			body: form,
		});
	} catch (error: any) {
		// ofetch's FetchError hides the response body behind `.data` by default —
		// surface Ticket Tailor's actual validation message instead of a bare
		// "400 Bad Request" so failures here are diagnosable without needing to
		// reproduce the request outside the app.
		const fieldError = error?.data?.errors?.[0];
		const detail = fieldError ? `${fieldError.field}: ${fieldError.messages?.[0]}` : error?.data?.message;

		throw createError({
			statusCode: 502,
			statusMessage: detail ?? 'Ticket Tailor rejected the bundle request',
			data: error?.data,
		});
	}

	if (!bundle.access_code) {
		throw createError({ statusCode: 500, statusMessage: 'Ticket Tailor did not return an access code for the bundle' });
	}

	// Records who this bundle belongs to, at the one point in this whole flow
	// where we reliably know that (a genuine authenticated fetch call) — the
	// later Ticket Tailor redirect can't identify the user itself (see
	// redirect.get.ts), so the Directus flow that turns a paid order into a
	// congress_orders row looks this claim up via the order's own line_items
	// reference back to the bundle. A guest checkout has no account to claim
	// through, so it gets a random, unguessable token instead — handed back
	// to the browser below and stashed in the (persisted) basket store, so
	// confirmation.vue can present it later as proof of "this is genuinely
	// the customer who placed this order" (tt_order_id alone is sequential
	// and guessable, not a safe lookup key on its own).
	//
	// submission (see complete.vue) links this claim to whichever
	// checkout_form submission — if any — was made for this checkout, so the
	// submission can be traced back to the order it was for once the Directus
	// flow resolves this claim into a congress_orders row.
	const userId = await getCheckoutUserId(event);
	const guestToken = userId ? null : randomBytes(24).toString('hex');

	try {
		await directusServer.request(
			withToken(
				config.directusOrderBotToken as string,
				createItem('congress_order_owners' as any, {
					bundle_id: bundle.id,
					user: userId,
					token: guestToken,
					submission: body?.formSubmissionId ?? null,
				}),
			),
		);
	} catch (error) {
		console.error(`[bundle.post] Could not record congress_order_owners claim for bundle ${bundle.id}:`, error);
	}

	// ttEvent.checkout_url comes back as a "/checkout/view-event/id/.../chk/.../"
	// link (confirmed empirically) — that path resumes whatever's already in the
	// visitor's existing TT_SessionID-tied cart rather than starting clean, which
	// is exactly what let a stale bundle from an earlier checkout attempt bleed
	// into a new one. Ticket Tailor's own widget-generated links use
	// "/checkout/new-session/..." instead (same event/checkout ids, just a
	// different mode segment), which does start fresh — swapped in here since
	// every bundle here is meant to be its own one-time basket, never a resume.
	//
	// Prefilling the widget's name/email fields for a logged-in customer works
	// via a URL hash fragment, not query params (per Ticket Tailor's own docs:
	// https://help.tickettailor.com/en/articles/9859154) — and only through
	// the actual widget.js-rendered widget (see CheckoutEmbed.vue), never a
	// direct link/redirect ("Passing pre-filled information directly to
	// checkout URLs is not currently possible").
	const contact = await getCheckoutContactDetails(event);
	const presetDataFragment = contact
		? `&preset_data=1#p[first_name]=${encodeURIComponent(contact.firstName)}&p[last_name]=${encodeURIComponent(contact.lastName)}&p[email]=${encodeURIComponent(contact.email)}`
		: '';
	const checkoutUrl = `${ttEvent.checkout_url.replace('/checkout/view-event/', '/checkout/new-session/')}?${TICKET_TAILOR_ACCESS_CODE_PARAM}=${encodeURIComponent(bundle.access_code)}${presetDataFragment}`;

	return {
		bundle: {
			id: bundle.id,
			accessCode: bundle.access_code,
			checkoutUrl,
		},
		guestToken,
	};
});
