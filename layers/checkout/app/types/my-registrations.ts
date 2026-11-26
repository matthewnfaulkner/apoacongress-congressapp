/**
 * Response of GET /api/checkout/my-registrations — the attendee's own
 * registrations on this site. See server/api/checkout/my-registrations.get.ts.
 */

export interface MyRegistrationTicket {
	id: string;
	name: string | null;
	kind: 'admission' | 'add-on';
}

export interface MyCompanion {
	id: string;
	title: string | null;
	first_name: string | null;
	last_name: string | null;
	email: string | null;
}

export interface MyRegistration {
	id: string;
	status: 'pending' | 'confirmed';
	kind: 'delegate' | 'accompanying' | null;
	title: string | null;
	first_name: string | null;
	last_name: string | null;
	email: string | null;
	/** Badge prefix + delegate number, e.g. "FD12". Null until confirmed. */
	delegate_label: string | null;
	badge_type_name: string | null;
	badge_name: string | null;
	organisation_name: string | null;
	city: string | null;
	country: string | null;
	/** Companions: the delegate they come with. */
	host_name: string | null;
	/** Delegates: the people accompanying them (editable by the delegate). */
	companions: MyCompanion[];
	/** False after the assignment cutoff — companions become read-only. */
	can_change: boolean;
	/** Admission first, then add-ons. */
	tickets: MyRegistrationTicket[];
}
