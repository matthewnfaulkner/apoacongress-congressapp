import type { TTEvent, TTTicketGroup, TTTicketType } from '../../app/types/ticket-tailor';
import type {
	AccommodationHotel,
	AccommodationRoomSize,
	AccommodationStay,
	CheckoutEvent,
	CheckoutGroup,
	CheckoutStep,
	CheckoutTicketOption,
} from '../../app/types/checkout';
import type { TicketEnrichment } from './congress-ticket-enrichment';

function stepForGroupName(name: string): CheckoutStep {
	const normalized = name.trim().toLowerCase();

	if (normalized.startsWith('accommodation')) return 'accommodation';
	if (normalized.startsWith('addon') || normalized.startsWith('add-on')) return 'addons';
	if (normalized.startsWith('tour')) return 'tours';
	if (normalized.startsWith('workshop')) return 'workshops';

	return 'registration';
}

function normalizeTicketType(
	ticketType: TTTicketType,
	currency: string,
	now: number,
	enrichment: TicketEnrichment | undefined,
): CheckoutTicketOption {
	const availableFrom = ticketType.hide_until?.iso ?? null;
	const availableUntil = ticketType.hide_after?.iso ?? null;

	const isTimeGated =
		(availableFrom !== null && now < new Date(availableFrom).getTime()) ||
		(availableUntil !== null && now > new Date(availableUntil).getTime());

	const isSoldOut = ticketType.quantity <= 0;
	// Driven by congress_charges.members_only (via congress-ticket-enrichment),
	// not Ticket Tailor's own members_only ticket status — that surfaces a
	// confusing "enter membership code" prompt on their hosted checkout that
	// doesn't apply here, since membership is verified via the logged-in
	// user's account rather than a code.
	const requiresMembership = enrichment?.membersOnly ?? false;
	// Membership isn't known yet here — this response is cached and shared across
	// users, so the membership check is applied afterwards via `applyMembership`.
	const isOrderable = !isSoldOut && !isTimeGated;

	return {
		id: ticketType.id,
		groupId: ticketType.group_id,
		name: ticketType.name,
		description: ticketType.description,
		richDescription: enrichment?.richDescription ?? null,
		shortDescription: enrichment?.shortDescription ?? null,
		tagline: enrichment?.tagline ?? null,
		price: ticketType.price,
		bookingFee: ticketType.booking_fee,
		currency,
		minPerOrder: ticketType.min_per_order ?? 1,
		maxPerOrder: ticketType.max_per_order ?? ticketType.quantity,
		quantityRemaining: ticketType.quantity,
		isSoldOut,
		isTimeGated,
		availableFrom,
		availableUntil,
		requiresMembership,
		isOrderable,
	};
}

/**
 * Builds the hotel -> room size -> stay length nesting for the accommodation
 * step. A ticket type only appears here once it has a `congress_tickets` row
 * linked to a congress_charge with a hotel — unlinked accommodation ticket
 * types stay hidden until you link them in Directus, rather than showing up
 * unenriched (there'd be no hotel to bucket them under).
 */
function buildAccommodationHotels(
	accommodationGroups: TTTicketGroup[],
	ticketTypesByGroup: Map<string, TTTicketType[]>,
	currency: string,
	now: number,
	enrichmentById: Map<string, TicketEnrichment>,
): AccommodationHotel[] {
	const hotelsById = new Map<string, AccommodationHotel>();

	const sortedGroups = accommodationGroups.slice().sort((a, b) => a.sort_order - b.sort_order);

	for (const group of sortedGroups) {
		const ticketTypes = (ticketTypesByGroup.get(group.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

		for (const ticketType of ticketTypes) {
			const enrichment = enrichmentById.get(ticketType.id);
			if (!enrichment?.hotel) continue;

			const option = normalizeTicketType(ticketType, currency, now, enrichment);
			// Time-gated tickets are fully hidden outside their window (not shown
			// greyed-out) — regardless of membership status.
			if (option.isTimeGated) continue;

			const stay: AccommodationStay = {
				...option,
				stayLength: enrichment.stayLength,
				checkIn: enrichment.checkIn,
				checkOut: enrichment.checkOut,
			};

			let hotelEntry = hotelsById.get(enrichment.hotel.id);
			if (!hotelEntry) {
				hotelEntry = { id: enrichment.hotel.id, hotel: enrichment.hotel, roomSizes: [] };
				hotelsById.set(enrichment.hotel.id, hotelEntry);
			}

			const roomSizeName = enrichment.roomSize ?? group.name;
			const roomSizeId = `${hotelEntry.id}:${roomSizeName}`;
			let roomSizeEntry = hotelEntry.roomSizes.find((candidate) => candidate.id === roomSizeId);
			if (!roomSizeEntry) {
				roomSizeEntry = { id: roomSizeId, name: roomSizeName, stays: [] };
				hotelEntry.roomSizes.push(roomSizeEntry);
			}

			roomSizeEntry.stays.push(stay);
		}
	}

	return Array.from(hotelsById.values());
}

/**
 * Maps the raw Ticket Tailor event into the app's checkout steps. Every
 * ticket type is hidden in Ticket Tailor itself, so `status` here is purely
 * business logic for our own storefront, not a Ticket Tailor visibility
 * setting. `enrichmentById` comes from the linked congress_tickets/charges
 * data (see congress-ticket-enrichment.ts) and is membership-agnostic and
 * safe to cache, same as the rest of this response.
 *
 * `bypassTicketTypeId` (congress.tt_bypass_id — see getCongressBypassTicketId)
 * is always excluded regardless of its own Ticket Tailor status: it has to be
 * *not* `locked` for Ticket Tailor's bundle-creation API to accept it (see
 * bundle.post.ts), which would otherwise make it a normal, orderable,
 * $0-priced option here — it must never be customer-selectable, only ever
 * added to a bundle's ticket_type_ids directly, server side.
 */
export function normalizeCheckoutEvent(
	event: TTEvent,
	enrichmentById: Map<string, TicketEnrichment>,
	bypassTicketTypeId?: string | null,
): CheckoutEvent {
	const now = Date.now();

	const steps: Record<CheckoutStep, CheckoutGroup[]> = {
		registration: [],
		accommodation: [],
		addons: [],
		tours: [],
		workshops: [],
	};

	const ticketTypesByGroup = new Map<string, TTTicketType[]>();

	for (const ticketType of event.ticket_types) {
		// Locked ticket types are gated by their own manually-shared access code —
		// out of scope for the basket UI entirely.
		if (ticketType.status === 'locked') continue;
		if (bypassTicketTypeId && ticketType.id === bypassTicketTypeId) continue;

		const list = ticketTypesByGroup.get(ticketType.group_id) ?? [];
		list.push(ticketType);
		ticketTypesByGroup.set(ticketType.group_id, list);
	}

	const sortedGroups = [...event.ticket_groups]
		.filter((group) => group.ticket_ids.length > 0)
		.sort((a, b) => a.sort_order - b.sort_order);

	const accommodationGroups: TTTicketGroup[] = [];

	for (const group of sortedGroups) {
		const step = stepForGroupName(group.name);

		if (step === 'accommodation') {
			accommodationGroups.push(group);
			continue;
		}

		const options = (ticketTypesByGroup.get(group.id) ?? [])
			.slice()
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((ticketType) => normalizeTicketType(ticketType, event.currency, now, enrichmentById.get(ticketType.id)))
			// Time-gated tickets are fully hidden outside their window (not shown
			// greyed-out) — regardless of membership status.
			.filter((option) => !option.isTimeGated);

		if (options.length === 0) continue;

		steps[step].push({
			id: group.id,
			name: group.name,
			step,
			sortOrder: group.sort_order,
			minPerOrder: group.min_per_order,
			maxPerOrder: group.max_per_order,
			options,
		});
	}

	const accommodationHotels = buildAccommodationHotels(accommodationGroups, ticketTypesByGroup, event.currency, now, enrichmentById);

	return {
		eventId: event.id,
		name: event.name,
		currency: event.currency,
		checkoutUrl: event.checkout_url,
		isMember: false,
		// Overridden by the caller (event.get.ts / bundle.post.ts already know
		// which event they fetched) — this placeholder just satisfies the type.
		locality: 'international',
		steps,
		accommodationHotels,
	};
}

/**
 * Applies per-request membership state on top of a (possibly cached, shared)
 * normalized event: `members_only` options only become orderable for members.
 * Never trust `isOrderable` from a client-supplied payload — this is display
 * logic only; `bundle.post.ts` re-derives it server-side before creating a bundle.
 */
export function applyMembership(checkoutEvent: CheckoutEvent, isMember: boolean): CheckoutEvent {
	const steps = Object.fromEntries(
		Object.entries(checkoutEvent.steps).map(([step, groups]) => [
			step,
			groups.map((group) => ({
				...group,
				options: group.options.map((option) => ({
					...option,
					isOrderable: option.isOrderable && (!option.requiresMembership || isMember),
				})),
			})),
		]),
	) as CheckoutEvent['steps'];

	const accommodationHotels = checkoutEvent.accommodationHotels.map((hotelEntry) => ({
		...hotelEntry,
		roomSizes: hotelEntry.roomSizes.map((roomSize) => ({
			...roomSize,
			stays: roomSize.stays.map((stay) => ({
				...stay,
				isOrderable: stay.isOrderable && (!stay.requiresMembership || isMember),
			})),
		})),
	}));

	return { ...checkoutEvent, isMember, steps, accommodationHotels };
}
