export type CheckoutStep = 'registration' | 'addons' | 'tours' | 'workshops';

export interface CheckoutTicketOption {
	id: string;
	groupId: string;
	name: string;
	description: string | null;
	// From the linked congress_tickets -> congress_charges row, when linked —
	// a fuller description than Ticket Tailor's own, used to embellish cards.
	richDescription: string | null;
	// Also from congress_charges: shortDescription for the card itself (before
	// "View details"), tagline as a small badge above the option name.
	shortDescription: string | null;
	// congress_charges.details_page (a `pages` relation) — when set, the "View
	// details" modal renders this page's blocks instead of richDescription.
	detailsPermalink: string | null;
	tagline: string | null;
	price: number;
	bookingFee: number;
	currency: string;
	minPerOrder: number;
	maxPerOrder: number;
	quantityRemaining: number;
	isSoldOut: boolean;
	isTimeGated: boolean;
	availableFrom: string | null;
	availableUntil: string | null;
	requiresMembership: boolean;
	isOrderable: boolean;
	// From congress_charges.requires_evidence/evidence_details — when true,
	// complete.vue collects a supporting PDF for this ticket type before
	// checkout can proceed (see CreateBundleRequest.evidence).
	requiresEvidence: boolean;
	evidenceDetails: string | null;
}

export interface CheckoutGroup {
	id: string;
	name: string;
	step: CheckoutStep;
	sortOrder: number;
	minPerOrder: number | null;
	maxPerOrder: number | null;
	options: CheckoutTicketOption[];
}

export interface CheckoutHotel {
	id: string;
	name: string;
	starRating: number | null;
	image: string | null;
	tagline: string | null;
}

// A single stay-length option, one level below "room size" in the nested
// accommodation picker. Structurally a CheckoutTicketOption (same fields the
// rest of the basket/bundle machinery already knows how to handle) plus the
// stay-specific dates pulled from the linked congress_charge.
export interface AccommodationStay extends CheckoutTicketOption {
	stayLength: string | null;
	checkIn: string | null;
	checkOut: string | null;
}

export interface AccommodationRoomSize {
	id: string;
	name: string;
	stays: AccommodationStay[];
}

export interface AccommodationHotel {
	id: string;
	hotel: CheckoutHotel;
	roomSizes: AccommodationRoomSize[];
}

export interface CheckoutEvent {
	eventId: string;
	name: string;
	currency: string;
	checkoutUrl: string;
	isMember: boolean;
	// Which of the two Ticket Tailor events (national/Taiwan vs international)
	// this response was fetched from — see checkout-locality.ts server-side.
	locality: 'national' | 'international';
	// tickets / addons / tours — accommodation is intentionally not populated
	// here; it's only ever exposed via `accommodationHotels` below, since it
	// needs a hotel -> room size -> stay length nested browsing UI instead of
	// a flat list.
	steps: Record<CheckoutStep, CheckoutGroup[]>;
	accommodationHotels: AccommodationHotel[];
}

export interface BasketLine {
	ticketTypeId: string;
	quantity: number;
}

export interface CheckoutBundle {
	id: string;
	accessCode: string;
	checkoutUrl: string;
}

export interface CreateBundleRequest {
	lines: BasketLine[];
	locality?: 'national' | 'international' | null;
	// The order this basket is meant to be adding on to, if any (see
	// useCheckoutAddOn) — lets bundle.post.ts verify a registration-less
	// basket is actually a legitimate add-on before creating a bundle Ticket
	// Tailor's own dependency rule would just reject anyway, rather than
	// silently trusting the client's isAddOn state.
	orderId?: string | null;
	// The form_submissions row id for the optional checkout_form (see
	// complete.vue / FormBuilder's exposed lastSubmissionId), if it was
	// submitted for this checkout — attached to the congress_order_owners
	// claim bundle.post.ts writes, so the submission can be traced back to
	// whichever order it was for.
	formSubmissionId?: string | null;
	// Attached to the congress_order_owners claim (see bundle.post.ts) for
	// traceability - the client already has this from the site-data store's
	// Site.congress, so it's passed through rather than re-resolved server-side.
	congressId?: string | null;
	// One uploaded evidence file id (see evidence-upload.post.ts) per basket
	// line whose ticket type has congress_charges.requires_evidence set —
	// bundle.post.ts re-checks that every such line actually has an entry
	// here rather than trusting the client sent them all, then creates each
	// as its own congress_order_evidence row nested under the claim.
	evidence?: Record<string, string> | null;
}

export interface CreateBundleResponse {
	bundle: CheckoutBundle;
	// A random token identifying this checkout when there's no logged-in
	// account to claim ownership through — null for a logged-in customer's
	// checkout, where the account itself is the ownership proof instead. See
	// bundle.post.ts and useCheckoutBasketStore's guestOrderToken.
	guestToken: string | null;
}
