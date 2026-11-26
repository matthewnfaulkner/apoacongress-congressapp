/**
 * Response of GET /api/checkout/order/:id/places — everything the buyer's
 * "Manage tickets" page needs, read from Directus only (never Ticket
 * Tailor). See server/api/checkout/order/[id]/places.get.ts.
 */

export type RegistrationKind = 'delegate' | 'accompanying';

export interface ManagedRegistration {
	id: string;
	status: 'pending' | 'confirmed' | 'cancelled';
	title: string | null;
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	/** Companions only: the delegate registration they come with. */
	host_registration: string | null;
	/** Badge prefix + delegate number, e.g. "FD12". Null until confirmed. */
	delegate_label: string | null;
	badge_type_name: string | null;
}

/** One admission ticket (delegate or accompanying) and the place it created. */
export interface ManagedPlace {
	ticket_id: string;
	ticket_name: string | null;
	kind: RegistrationKind;
	/** Null only if the sync flow hasn't created the registration yet. */
	registration: ManagedRegistration | null;
}

export interface ManagedAddOn {
	ticket_id: string;
	ticket_name: string | null;
	/** The registration it's attached to; null = not allocated yet. */
	registration: string | null;
	/**
	 * Name of whoever it's attached to. Needed because an add-on can belong to
	 * a registration from a *different* order (e.g. bought later for an
	 * existing attendee), which won't be in this order's places list.
	 */
	registration_name: string | null;
}

export interface ManageTicketsResponse {
	order_id: string;
	/** False after the cutoff — the page shows everything read-only. */
	can_change: boolean;
	places: ManagedPlace[];
	companions: ManagedPlace[];
	/** Unattached first. */
	add_ons: ManagedAddOn[];
}
