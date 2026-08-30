export interface TTDate {
	date: string;
	formatted: string;
	iso: string;
	time: string;
	timezone: string;
	unix: number;
}

export interface TTTicketGroup {
	object: 'ticket_group';
	id: string;
	name: string;
	sort_order: number;
	min_per_order: number | null;
	max_per_order: number | null;
	max_quantity: number | null;
	ticket_ids: string[];
	bundle_ids: string[];
}

export type TTTicketTypeStatus = 'on_sale' | 'members_only' | 'locked' | 'sold_out' | 'hidden' | string;

export interface TTTicketType {
	object: 'ticket_type';
	id: string;
	group_id: string;
	name: string;
	description: string | null;
	price: number;
	booking_fee: number;
	status: TTTicketTypeStatus;
	type: string;
	access_code: string | null;
	min_per_order: number | null;
	max_per_order: number | null;
	quantity: number;
	quantity_total: number;
	quantity_issued: number;
	quantity_held: number;
	quantity_in_baskets: number;
	hide_until: TTDate | null;
	hide_after: TTDate | null;
	hide_when_sold_out: boolean | 'true' | 'false';
	sort_order: number;
}

export interface TTBundleTicketType {
	id: string;
	quantity: number;
}

export interface TTBundleProduct {
	id: string;
	quantity: number;
}

export interface TTBundle {
	object: 'bundle';
	id: string;
	access_code: string | null;
	name: string;
	description: string | null;
	group_id: string;
	price: number;
	booking_fee: number;
	status: string;
	ticket_types: TTBundleTicketType[];
	products: TTBundleProduct[];
}

export interface TTEvent {
	object: 'event';
	id: string;
	event_series_id: string;
	name: string;
	status: string;
	currency: string;
	timezone: string;
	checkout_url: string;
	start: TTDate;
	end: TTDate;
	ticket_groups: TTTicketGroup[];
	ticket_types: TTTicketType[];
	bundles: TTBundle[];
}

// Per Ticket Tailor's documented Order.issued_tickets shape — one entry per
// physically-issued ticket (as opposed to line_items, which are purchase
// summary rows grouped by ticket type). Not yet confirmed against a real
// order the way the rest of this file's fields are — correct anything that
// turns out to differ.
export interface TTIssuedTicket {
	object: 'issued_ticket';
	id: string;
	add_on_id: string | null;
	barcode: string;
	barcode_url: string;
	checked_in: 'true' | 'false';
	created_at: number;
	description: string;
	email: string | null;
	event_id: string;
	event_series_id: string;
	group_ticket_barcode: string | null;
	reference: string | null;
	full_name: string | null;
	first_name: string | null;
	last_name: string | null;
	listed_price: number | null;
	reservation: string | null;
	status: 'valid' | 'voided';
	source: 'api' | 'dashboard_import' | null;
	ticket_type_id: string | null;
	updated_at: number;
	voided_at: number | null;
	order_id: string | null;
	qr_code_url: string;
	[key: string]: unknown;
}

// Per GET /v1/orders/:order_id — only the fields this integration actually
// reads are typed precisely; the rest are left loose since the full shape
// wasn't needed here.
export interface TTOrder {
	object: 'order';
	id: string;
	status: 'completed' | 'pending' | 'cancelled';
	status_message: string | null;
	// Unix timestamp (seconds), per Ticket Tailor's docs.
	created_at: number;
	total: number;
	total_paid: number;
	subtotal: number;
	tax: number;
	// Confirmed via a real order (GET /v1/orders/:id): { base_multiplier: 100, code: "usd" }
	currency: { code: string; base_multiplier: number };
	// Confirmed via a real order (GET /v1/orders/:id) — there is no
	// `reference` field. `name` is the configured payment method's display
	// name (e.g. "EC Pay") — the redirect route Ticket Tailor sends
	// offline-payment orders to fires for every offline payment method, not
	// just ECPay, so this must be checked before proceeding.
	// `instructions` is set for manual/offline payment methods (e.g. bank
	// transfer) — free text the box office configured, shown to the customer
	// so they know how to actually pay (see confirmation.vue).
	payment_method: { id: string; name?: string | null; type?: string | null; instructions?: string | null; [key: string]: unknown } | null;
	txn_id: string | null;
	// Confirmed via a real order (GET /v1/orders/:id) — an order created
	// through one of our bundles has a line_item with type "bundle" whose
	// item_id is that bundle's id (e.g. "bu_93590"). Used to trace an order
	// back to the congress_order_owners claim written at bundle-creation time.
	// Ticket Tailor's own docs list narrower `type` values (ticket,
	// transaction_charge, void, tax, gift_card, donation) that don't include
	// "bundle" — trusting the empirical result over the docs here, same as
	// elsewhere in this file.
	line_items: Array<{ object: 'line_item'; id: string; item_id: string; type: string; quantity: number; booking_fee: number; total: number; value: number; [key: string]: unknown }>;
	// Nullable per Ticket Tailor's docs — one entry per physically-issued
	// ticket. See TTIssuedTicket.
	issued_tickets: TTIssuedTicket[] | null;
	// Bolted on by order/[id].get.ts from the congress_orders row's own
	// issued_tickets repeater (see run-script.js's extract_order) — not part
	// of Ticket Tailor's own order shape. This is the trustworthy source for
	// each ticket's answered custom fields: Ticket Tailor's own order-detail
	// endpoint isn't confirmed to return custom_questions on issued_tickets
	// at all, unlike the webhook payload TTIssuedTicket above was modeled on.
	local_issued_tickets?: Array<{ id: string; custom_fields: Array<{ name: string; answer: string | null }> }> | null;
	// Same bolt-on pattern as local_issued_tickets, from congress_orders.invoices
	// (an M2M to directus_files — see the generate_invoice / Generate PDF
	// operations on the webhook flow). Already reversed to newest first,
	// trusting the M2M's own creation order rather than uploaded_on for
	// sorting — uploaded_on is only carried along here for display.
	local_invoices?: Array<{ id: string; filename_download: string; uploaded_on: string }>;
	// Same bolt-on pattern, from congress_orders.payment_proof (a single Files
	// M2O, not an M2M like invoices) — set once the customer has uploaded
	// evidence of a manual/offline payment (see payment-proof.post.ts).
	local_payment_proof?: { id: string; filename_download: string; uploaded_on: string } | null;
	[key: string]: unknown;
}

export interface TTListResponse<T> {
	data: T[];
	links: { next: string | null; previous: string | null };
}

// Sent as application/x-www-form-urlencoded. Their docs (and support) say
// ticket_type_ids/product_ids are a JSON-object string (id -> quantity), but
// that's silently rejected — the format that actually works is PHP-style
// bracket notation with the id as the key: `ticket_type_ids[tt_xxx]=quantity`
// (see bundle.post.ts, confirmed empirically). There is no group_id on this
// request; Ticket Tailor assigns that itself. access_code isn't
// auto-generated when omitted — always send one if the checkout URL needs it.
export interface TTCreateBundleRequest {
	name: string;
	description: string;
	price: number;
	booking_fee?: number;
	access_code?: string;
	status?: 'ADMIN_ONLY' | 'HIDDEN' | 'LOCKED' | 'SOLD_OUT' | 'ON_SALE' | 'UNAVAILABLE';
	min_per_order?: number;
	max_per_order?: number;
	ticket_type_ids: Record<string, number>;
	product_ids?: Record<string, number>;
}
