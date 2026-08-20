/**
 * Directus Flow "Run Script" operation.
 *
 * Expected flow shape:
 *   1. An earlier step (Read Data / previous operation) that produces the
 *      list of congress_charges to import — passed in as `data.$last` or
 *      whatever alias your flow uses (see CHARGES_KEY below).
 *   2. A "create ticket groups" step (one ticket_group per distinct
 *      congress_charges.category) run BEFORE this one — its response is fed
 *      in here (see GROUPS_KEY below) so each charge can be matched to the
 *      group_id Ticket Tailor assigned it.
 *   3. THIS step formats each charge into a Ticket Tailor create-ticket-type
 *      payload. It does not call the Ticket Tailor API itself — wire its
 *      output into a following "HTTP Request" (or another Run Script that
 *      loops and POSTs) to
 *        POST https://api.tickettailor.com/v1/event_series/:event_series_id/ticket_types
 *
 * ASSUMPTIONS TO VERIFY EMPIRICALLY (Ticket Tailor's write-API behavior has
 * repeatedly diverged from its docs elsewhere in this project — e.g. bundle
 * creation needed form-urlencoded bracket notation, not JSON):
 *   - ticket_type creation likely also wants application/x-www-form-urlencoded,
 *     not a JSON body — this script returns plain objects; whatever step
 *     actually calls the API may need to convert each payload to a
 *     URLSearchParams body the same way bundle.post.ts does.
 *   - `hide_after` is assumed to accept a plain date/ISO string on write,
 *     even though Ticket Tailor's read responses return it as an expanded
 *     { date, formatted, iso, time, timezone, unix } object. Confirm with a
 *     single real POST before running this over the full charge list.
 */
module.exports = async function (data) {
	// Adjust these two keys to match your flow's actual step aliases.
	const CHARGES_KEY = '$trigger'; // or e.g. 'read_congress_charges'
	const GROUPS_KEY = 'create_ticket_groups'; // the earlier "create groups" step's alias

	const charges = data[CHARGES_KEY]?.congress_charges ?? data[CHARGES_KEY] ?? [];
	const groupResults = data[GROUPS_KEY] ?? [];

	// Matches a created ticket_group back to a charge's category by name —
	// i.e. the groups must be named exactly (case-insensitively) after the
	// category values: "Registration", "Accommodation", "Tours",
	// "Workshops", "Social Events". Adjust to taste if you named them
	// differently, or build this map directly if your "create groups" step
	// already returns { category: group_id } instead of raw Ticket Tailor
	// group objects.
	const groupIdByCategory = {};
	for (const group of groupResults) {
		const category = String(group.name ?? '').trim().toLowerCase().replace(/\s+/g, '_');
		groupIdByCategory[category] = group.id;
	}

	function centsFromUsd(priceUsd) {
		const dollars = typeof priceUsd === 'string' ? parseFloat(priceUsd) : priceUsd;
		if (!Number.isFinite(dollars)) throw new Error(`Bad price value: ${priceUsd}`);
		return Math.round(dollars * 100);
	}

	function firstDetail(charge) {
		return Array.isArray(charge.details) ? charge.details[0] ?? {} : {};
	}

	function hotelName(charge) {
		if (charge.hotel && typeof charge.hotel === 'object') return charge.hotel.name ?? '';
		return '';
	}

	function buildName(charge) {
		const category = String(charge.category ?? '').toLowerCase();
		const detail = firstDetail(charge);

		if (category === 'registration') {
			const cutoffSuffix = detail.cutoff_description ? ` (${detail.cutoff_description})` : '';
			return `${charge.sub_category ?? ''}${cutoffSuffix}`;
		}

		if (category === 'accommodation') {
			return `${detail.stay_length ?? ''} - ${charge.sub_category ?? ''} - ${hotelName(charge)}`;
		}

		// tours, workshops, social_events, and anything else use the generic
		// charge detail's own name field.
		return detail.name ?? '';
	}

	function buildHideAfter(charge) {
		if (String(charge.category ?? '').toLowerCase() !== 'registration') return undefined;
		const detail = firstDetail(charge);
		return detail.cutoff_date || undefined;
	}

	const payloads = charges.map((charge) => {
		const category = String(charge.category ?? '').toLowerCase();
		const groupId = groupIdByCategory[category];

		if (!groupId) {
			throw new Error(`No ticket_group id found for category "${charge.category}" (charge ${charge.id}) — check the groups were created/named first.`);
		}

		const priceCents = centsFromUsd(charge.price);
		const bookingFee = Math.round(priceCents * 0.03);

		const payload = {
			name: buildName(charge),
			group_id: groupId,
			price: priceCents,
			booking_fee: bookingFee,
			status: 'hidden',
			quantity: 1000,
			show_quantity_remaining_less_than: false,
		};

		const hideAfter = buildHideAfter(charge);
		if (hideAfter) payload.hide_after = hideAfter;

		return { chargeId: charge.id, payload };
	});

	return payloads;
};
