
// Directus geometry.Point fields (e.g. Hotel.location, Venue.location) come
// back as raw GeoJSON, but the generator types them as a bare `string` —
// pages/endpoints that read .coordinates off one cast to this instead.
export interface GeoJSONPoint {
	type: 'Point';
	coordinates: [number, number];
}

export interface ExtensionSeoMetadata {
    title?: string;
    meta_description?: string;
    og_image?: string;
    additional_fields?: Record<string, unknown>;
    sitemap?: {
        change_frequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
        priority: string;
    };
    no_index?: boolean;
    no_follow?: boolean;
}

export interface AbstractCriteria {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	criteria?: string | null;
	description?: string | null;
	weight?: number | null;
	grading_system?: AbstractGradingSystem | string | null;
	sort?: number | null;
}

export interface AbstractGradingSystem {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	aggregation_method?: 'sum' | null;
	criteria?: AbstractCriteria[] | string[];
	scoring?: AbstractScoring[] | string[];
}

export interface AbstractReviewer {
	/** @primaryKey */
	id: number;
	abstract?: Abstract | string | null;
	user?: DirectusUser | string | null;
	categories?: 'json' | null;
	email?: string | null;
	token_hash?: string | null;
	token_expires_at?: string | null;
	token_sent_at?: string | null;
}

export interface AbstractReview {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	submission?: AbstractSubmission | string | null;
	score?: number | null;
	comments?: string | null;
	reviewer?: AbstractReviewer | string | null;
	scores?: AbstractReviewScore[] | string[];
}

export interface AbstractReviewScore {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	review?: AbstractReview | string | null;
	criteria?: AbstractCriteria | string | null;
	score?: AbstractScoring | string | null;
}

export interface Abstract {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	congress?: Congress | string | null;
	submission_deadline?: string | null;
	description?: string | null;
	categories?: 'json' | null;
	submission_limit?: number | null;
	acceptance_limit?: number | null;
	required_reviewers?: number | null;
	/** @description Setup email notifications when forms are submitted. */
	emails?: Array<{ to: string[]; subject: string; preview: string; message: string }> | null;
	review_method?: 'ffa' | 'assigned' | null;
	reviewer_limit?: number | null;
	grading_system?: AbstractGradingSystem | string | null;
	declaration_statement?: string | null;
	word_limit?: number;
	submissions?: AbstractSubmission[] | string[];
	reviewers?: AbstractReviewer[] | string[];
}

export interface AbstractScoring {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	score?: number | null;
	rating?: string | null;
	description?: string | null;
	grading_system?: AbstractGradingSystem | string | null;
}

export interface AbstractSubmissionFigure {
	/** @primaryKey */
	id: number;
	submission?: AbstractSubmission | string | null;
	file?: DirectusFile | string | null;
	label?: string | null;
}

export interface AbstractSubmission {
	/** @primaryKey */
	id: string;
	status?: 'submitted' | 'pending_review' | 'reviewed' | 'invited' | 'accepted' | 'waiting_list' | 'rejected';
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	congress_abstract?: Abstract | string | null;
	submitter?: DirectusUser | string | null;
	keywords?: string[] | null;
	submission_values?: AbstractSubmissionValue[] | string[];
	reviews?: AbstractReview[] | string[];
	figures?: AbstractSubmissionFigure[] | string[];
}

export interface AbstractSubmissionValue {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	field?: string | null;
	submission?: AbstractSubmission | string | null;
	value?: string | null;
}

export interface AdminDocumentApproval {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	document?: AdminDocument | string | null;
	user?: DirectusUser | string | null;
	version?: string | null;
	status?: 'pending' | 'approved' | 'rejected' | null;
	comment?: string | null;
}

export interface AdminDocumentEvent {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	type?: 'version_created' | 'version_updated' | 'version_promoted' | 'approval_requested' | 'approval_decided' | null;
	version?: string | null;
	actor?: DirectusUser | string | null;
	detail?: string | null;
	document?: AdminDocument | string;
}

export interface AdminDocument {
	/** @primaryKey */
	id: string;
	status?: 'published' | 'draft' | 'archived';
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	site?: Site | string | null;
	/** @required */
	title: string;
	category?: 'Finance' | 'Programme' | 'Governance' | 'Logistics' | 'Overview' | null;
	description?: string | null;
	file?: DirectusFile | string | null;
	approvals?: AdminDocumentApproval[] | string[];
}

export interface AiPrompt {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description Unique name for the prompt. Use names like "create-article" or "generate-product-description". @required */
	name: string;
	/** @description Is this prompt published and available to use? */
	status?: 'draft' | 'in_review' | 'published';
	/** @description Briefly explain what this prompt does in 1-2 sentences. */
	description?: string | null;
	/** @description Optional: Define the conversation structure between users and AI. Used to add context and improve outputs. */
	messages?: Array<{ role: 'user' | 'assistant'; text: string }> | null;
	/** @description Instructions that shape how the AI responds. */
	system_prompt?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
}

export interface ApoaSection {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	organisation?: Organisation | string;
	committees?: ApoaSectionsCommittee[] | string[];
}

export interface ApoaSectionsCommittee {
	/** @primaryKey */
	id: number;
	apoa_section?: ApoaSection | string | null;
	committee?: Committee | string | null;
}

export interface Assignment {
	/** @primaryKey */
	id: number;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	event?: CongressEvent | string | null;
	role?: Role | string | null;
	person?: Person | string | null;
}

export interface BlockAccordion {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	headline?: string | null;
	tagline?: string | null;
	items?: BlockAccordionItem[] | string[];
}

export interface BlockAccordionItem {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	label?: string | null;
	icon?: string | null;
	content?: string | null;
	accordion?: BlockAccordion | string | null;
}

export interface BlockButton {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Group can contain other menu items. */
	type?: 'page' | 'post' | 'url' | null;
	/** @description The internal page to link to. */
	page?: Page | string | null;
	/** @description The internal post to link to. */
	post?: Post | string | null;
	/** @description Text to include on the button. */
	label?: string | null;
	/** @description What type of button */
	variant?: 'default' | 'outline' | 'soft' | 'ghost' | 'link' | null;
	/** @description The id of the Button Group this button belongs to. */
	button_group?: BlockButtonGroup | string | null;
	/** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://docs.directus.io`) */
	url?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
}

export interface BlockButtonGroup {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	/** @description Add individual buttons to the button group. */
	buttons?: BlockButton[] | string[];
}

export interface BlockChargetable {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	headline?: string | null;
	category?: 'congress' | 'accommodation' | null;
	tagline?: string | null;
	tabs?: BlockChargetableTab[] | string[];
}

export interface BlockChargetableColumn {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	heading?: string | null;
	tab?: BlockChargetableTab | string | null;
	charges?: BlockChargetableColumnsCharge[] | string[];
}

export interface BlockChargetableColumnsCharge {
	/** @primaryKey */
	id: number;
	column?: BlockChargetableColumn | string | null;
	charge?: CongressCharge | string | null;
	sort?: number | null;
	detail?: string | null;
}

export interface BlockChargetableTab {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	label?: string | null;
	chargetable?: BlockChargetable | string | null;
	row_labels?: string[] | null;
	columns?: BlockChargetableColumn[] | string[];
}

export interface BlockForm {
	/** @primaryKey */
	id: string;
	/** @description Form to show within block. Forms are filtered by site, and won't be visible when creating block. Finish creating block, save, then return to be able to select a form. */
	form?: Form | string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
}

export interface BlockFormFlow {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	flow?: FormFlow | string | null;
}

export interface BlockGallery {
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	/** @description Images to include in the image gallery. */
	items?: BlockGalleryItem[] | string[];
}

export interface BlockGalleryItem {
	/** @primaryKey */
	id: string;
	/** @description The id of the gallery block this item belongs to. */
	block_gallery?: BlockGallery | string | null;
	/** @description The id of the file included in the gallery. */
	directus_file?: DirectusFile | string | null;
	sort?: number | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	caption?: string | null;
}

export interface BlockHero {
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Featured image in the hero. */
	image?: DirectusFile | string | null;
	/** @description Action buttons that show below headline and description. */
	button_group?: BlockButtonGroup | string | null;
	/** @description Supporting copy that shows below the headline. */
	description?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description The layout for the component. You can set the image to display left, right, or in the center of page.. */
	layout?: 'image_left' | 'image_center' | 'image_right' | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
}

export interface BlockMainhero {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description Supporting copy that shows below the headline. */
	description?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	image?: DirectusFile | string | null;
	button_group?: BlockButtonGroup | string | null;
	countdown?: boolean | null;
	bgcolor?: string | null;
	logo?: DirectusFile | string | null;
	announcements?: BlockMainheroAnnouncement[] | string[];
	partners?: BlockMainheroPartner[] | string[];
}

export interface BlockMainheroAnnouncement {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	headline?: string | null;
	content?: string | null;
	hero?: BlockMainhero | string | null;
}

export interface BlockMainheroPartner {
	/** @primaryKey */
	id: number;
	block_mainhero?: BlockMainhero | string | null;
	organisation?: Organisation | string | null;
	sort?: number | null;
}

export interface BlockMessage {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	type?: 'standard' | 'carousel' | null;
	messages?: BlockMessagesMessage[] | string[];
}

export interface BlockMessagesMessage {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	block?: BlockMessage | string | null;
	tagline?: string | null;
	content?: string | null;
	button_group?: BlockButtonGroup | string | null;
	people?: BlockMessagesMessagePerson[] | string[];
}

export interface BlockMessagesMessagePerson {
	/** @primaryKey */
	id: number;
	message?: BlockMessagesMessage | string | null;
	person?: Person | string | null;
	extra?: string | null;
}

export interface BlockPeople {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	headline?: string | null;
	tagline?: string | null;
	type?: 'committee' | 'speakers' | null;
	display?: 'normal' | 'marquee' | null;
	show_country?: boolean | null;
	show_title?: boolean | null;
	show_flag?: boolean | null;
	people?: BlockPeoplePeople[] | string[];
}

export interface BlockPeoplePeople {
	/** @primaryKey */
	id: number;
	block_people_id?: BlockPeople | string | null;
	item?: Committee | CongressEvent | Assignment | PeopleList | string | null;
	collection?: string | null;
}

export interface BlockPost {
	/** @primaryKey */
	id: string;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description The collection of content to fetch and display on the page within this block. @required */
	collection: 'posts';
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	limit?: number | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
}

export interface BlockPricing {
	/** @primaryKey */
	id: string;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	tabs?: BlockPricingTab[] | string[];
}

export interface BlockPricingCard {
	/** @primaryKey */
	id: string;
	/** @description Name of the pricing plan. Shown at the top of the card. If using congress charges can be left blank. In this case the title will be the sub-category of the first card. */
	title?: string | null;
	/** @description Short, one sentence description of the pricing plan and who it is for. */
	description?: string | null;
	/** @description Price and term for the pricing plan. (ie `$199/mo`) */
	price?: string | null;
	/** @description Short list of features included in this plan. Press `Enter` to add another item to the list. */
	features?: 'json' | null;
	/** @description Add highlighted border around the pricing plan to make it stand out. */
	is_highlighted?: boolean | null;
	sort?: number | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	tab?: BlockPricingTab | string | null;
	/** @description Enabling this changes how the pricing card data is configured. Unchecked - completely manual. Checked - you can select from congress charges to populate the card data. */
	use_congress_charges?: boolean;
	category?: 'accommodation' | 'registration' | null;
	badge?: Array<{ label: string; link: string; target: 'self' | 'blank' }> | null;
	button_group?: BlockButtonGroup | string | null;
	congress_charges?: BlockPricingCardsCongressCharge[] | string[];
}

export interface BlockPricingCardsCongressCharge {
	/** @primaryKey */
	id: number;
	card?: BlockPricingCard | string | null;
	charge?: CongressCharge | string | null;
	sort?: number | null;
}

export interface BlockPricingTab {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	pricing?: BlockPricing | string | null;
	label?: string | null;
	pricing_cards?: BlockPricingCard[] | string[];
}

export interface BlockRichtext {
	/** @description Rich text content for this block. */
	content?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	translations?: BlockRichtextTranslation[] | null;
}

export interface BlockRichtextTranslation {
	/** @primaryKey */
	id: number;
	block_richtext_id?: BlockRichtext | string | null;
	languages_code?: Language | string | null;
	tagline?: string | null;
	headline?: string | null;
	content?: string | null;
}

export interface BlockSponsor {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description Supporting copy that shows below the headline. */
	description?: string | null;
	include_tiers?: boolean | null;
	sponsors?: BlockSponsorsSponsor[] | string[];
}

export interface BlockSponsorsSponsor {
	/** @primaryKey */
	id: number;
	block_sponsors?: BlockSponsor | string | null;
	sponsor?: CongressSponsor | string | null;
}

export interface CaseMessageFile {
	/** @primaryKey */
	id: number;
	message?: CaseMessage | string | null;
	file?: DirectusFile | string | null;
}

export interface CaseMessage {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	sender?: DirectusUser | string | null;
	sender_role?: 'customer' | 'agent' | null;
	sender_email?: string | null;
	message?: string | null;
	case?: SupportCase | string | null;
	is_internal?: boolean;
	files?: CaseMessageFile[] | string[];
}

export interface Committee {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	parent_committee?: Committee | string | null;
	congress?: Congress | string | null;
	slug?: string | null;
	sub_committees?: Committee[] | string[];
	positions?: CommitteePosition[] | string[];
}

export interface CommitteePosition {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	committee?: Committee | string | null;
	members?: PersonsCommitteePosition[] | string[];
}

export interface Congress {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	/** @required */
	startdate: string;
	/** @required */
	enddate: string;
	venue?: Venue | string | null;
	site?: Site | string | null;
	timezone?: `Asia/Kuala_Lumpur` | `Asia/Taipei` | `Asia/Kolkata` | null;
	organiser?: Organisation | string | null;
	tt_event_series_id?: string | null;
	tt_bypass_id?: string | null;
	tt_event_id?: string | null;
	days?: CongressDay[] | string[];
	abstracts?: Abstract[] | string[];
	privileges?: CongressPrivilege[] | string[];
	organisations?: CongressOrganisation[] | string[];
	hotels?: CongressHotel[] | string[];
	sponsors?: CongressSponsor[] | string[];
	sponsor_tiers?: CongressSponsorTier[] | string[];
	key_dates?: CongressKeyDate[] | string[];
	congress_vouchers?: CongressVoucher[] | string[];
	charges?: CongressCharge[] | string[];
}

export interface CongressAccessToken {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	/** @description The email the link was sent to. */
	email?: string;
	/** @description The secret in the link. */
	token?: string;
	/** @description The link stops working after this. */
	expires_at?: string | null;
	/** @description When the link was used. A used link can't be used again. */
	used_at?: string | null;
	/** @description The congress this access is for. */
	congress?: Congress | string | null;
}

export interface CongressBadgeType {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	date_updated?: string | null;
	/** @description The congress this badge type belongs to. @required */
	congress: Congress | string;
	sort?: number | null;
	/** @description E.g. Faculty @required */
	name: string;
	/** @description Shown in front of the delegate number, e.g. FD + 12 shows as FD12. The numbers themselves are shared by all badge types. @required */
	prefix: string;
	/** @description Badge colour. */
	color?: string | null;
	/** @description Registrations of this kind get this badge type when nothing else sets one. Use each choice on only one badge type per congress. */
	default_for?: 'delegate' | 'accompanying' | null;
	/** @description What this badge type can access, until access is modelled properly */
	access_notes?: string | null;
}

export interface CongressBreakRoom {
	/** @primaryKey */
	id: number;
	break?: CongressBreak | string | null;
	room?: VenueRoom | string | null;
}

export interface CongressBreak {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	starttime?: string | null;
	endtime?: string | null;
	schedule?: CongressSchedule | string | null;
	name?: string | null;
	details?: string | null;
	rooms?: CongressBreakRoom[] | string[];
}

export interface CongressCharge {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	congress?: Congress | string | null;
	category?: 'registration' | 'accommodation' | 'tours' | 'workshops' | 'social_events' | null;
	delegate?: 'National' | 'International' | null;
	sub_category?: string | null;
	price?: string | null;
	details?: 'json' | null;
	hotel?: Hotel | string | null;
	description?: string | null;
	tagline?: string | null;
	members_only?: boolean;
	short_description?: string | null;
	details_page?: Page | string | null;
	requires_evidence?: boolean;
	evidence_details?: string | null;
	/** @description The period this price applies in. Empty = every period. */
	pricing_period?: CongressPricingPeriod | string | null;
	/** @description Which kind of registration this admission creates. Set = this charge is an admission; empty = an add-on. */
	registration_type?: 'delegate' | 'accompanying' | null;
}

export interface CongressDay {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	starttime?: string;
	endtime?: string;
	title?: string | null;
	time_subdivision?: number;
	key?: string | null;
	congress?: Congress | string | null;
	date?: string | null;
	schedules?: CongressSchedule[] | string[];
	timeslots?: CongressDaySlot[] | string[];
}

export interface CongressDaySlot {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	day?: CongressDay | string | null;
	starttime?: string | null;
	endtime?: string | null;
}

export interface CongressEvent {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	/** @description For root events (no parent event), set session via the session form. Child events can only inherit their parents session. */
	session?: CongressSession | string | null;
	parent?: CongressEvent | string | null;
	/** @description Duration of event in minutes. */
	duration?: number;
	relative_start?: number;
	qr_code?: DirectusFile | string | null;
	tags?: string[] | null;
	type?: 'symposium' | 'talk' | 'panel' | 'free_papers' | 'workshop' | 'discussion' | 'plenary';
	topic?: string | null;
	price?: number | null;
	abstract_submission?: AbstractSubmission | string | null;
	children?: CongressEvent[] | string[];
	assignments?: Assignment[] | string[];
}

export interface CongressHotel {
	/** @primaryKey */
	id: number;
	hotel?: Hotel | string | null;
	congress?: Congress | string | null;
	directions?: string | null;
	tagline?: string | null;
	sort?: number | null;
	booking_url?: string | null;
}

export interface CongressIssuedTicket {
	/** @description The Ticket Tailor issued-ticket ID. @primaryKey */
	id: string;
	date_created?: string | null;
	date_updated?: string | null;
	/** @description The congress this ticket is for. */
	congress?: Congress | string | null;
	/** @description Empty for tickets issued directly (imports). */
	order?: CongressOrder | string | null;
	/** @description Its charge decides whether this is an admission or an add-on. */
	ticket_type?: CongressTicket | string | null;
	/** @description Whether the ticket is still valid in Ticket Tailor. */
	status?: 'valid' | 'voided' | null;
	/** @description When the ticket was voided. */
	voided_at?: string | null;
	/** @description As entered at checkout. */
	holder_title?: string | null;
	/** @description As entered at checkout. */
	holder_first_name?: string | null;
	/** @description As entered at checkout. */
	holder_last_name?: string | null;
	/** @description As entered at checkout. */
	holder_email?: string | null;
	/** @description Custom question answers. */
	answers?: Record<string, any> | null;
	/** @description The ticket's barcode value. */
	barcode?: string | null;
	/** @description The registration this ticket belongs to: its admission ticket or an add-on. */
	registration?: CongressRegistration | string | null;
	/** @description order = bought through a Ticket Tailor checkout (a sale). comp = given free by staff. import = paid elsewhere (partner portal). Only order counts as a sale. @required */
	source: 'order' | 'comp' | 'import';
}

export interface CongressKeyDate {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string;
	congress?: Congress | string | null;
	date?: string;
	time?: string | null;
	description?: string | null;
	public?: boolean | null;
	icon?: string | null;
}

export interface CongressOrderAccessToken {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	/** @required */
	email: string;
	/** @required */
	token: string;
	/** @required */
	expires_at: string;
	used_at?: string | null;
	congress?: Congress | string | null;
}

export interface CongressOrderOwner {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	bundle_id?: string | null;
	user?: DirectusUser | string | null;
	token?: string | null;
	submission?: FormSubmission | string | null;
	congress?: Congress | string | null;
	/** @description Set when staff made this checkout for a group. */
	group?: CongressRegistrationGroup | string | null;
	/** @description Set when this checkout is for an existing registration (add-ons, adding a companion). */
	registration?: CongressRegistration | string | null;
	/** @description Badge type for the registrations this checkout creates, e.g. a Faculty comp. */
	badge_type?: CongressBadgeType | string | null;
	/** @description The checkout link, so it can be re-sent. */
	checkout_url?: string | null;
	evidence?: CongressOrdersEvidence[] | string[];
}

export interface CongressOrder {
	/** @primaryKey */
	id: string;
	status?: 'completed' | 'pending' | 'cancelled';
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	congress?: Congress | string | null;
	user?: DirectusUser | string | null;
	token?: string | null;
	email?: string | null;
	submission?: FormSubmission | string | null;
	issued_tickets?: Array<{ id: string; custom_fields: Array<{ question: string; answer: string }> }> | null;
	payment_proof?: DirectusFile | string | null;
	/** @description The checkout record this order came from. */
	order_owner?: CongressOrderOwner | string | null;
	invoices?: CongressOrdersFile[] | string[];
	evidence?: CongressOrdersEvidence[] | string[];
	/** @description Tickets issued in this order. */
	tickets?: CongressIssuedTicket[] | string[];
}

export interface CongressOrderSession {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	/** @required */
	email: string;
	/** @required */
	token: string;
	/** @required */
	expires_at: string;
}

export interface CongressOrdersEvidence {
	/** @primaryKey */
	id: number;
	order?: CongressOrder | string | null;
	file?: DirectusFile | string | null;
	order_owner?: CongressOrderOwner | string | null;
	ticket_type_id?: string | null;
	/** @description The registration this evidence supports. */
	registration?: CongressRegistration | string | null;
}

export interface CongressOrdersFile {
	/** @primaryKey */
	id: number;
	congress_orders_id?: CongressOrder | string | null;
	directus_files_id?: DirectusFile | string | null;
}

export interface CongressOrganisation {
	/** @primaryKey */
	id: number;
	congress?: Congress | string | null;
	organisation?: Organisation | string | null;
	sort?: number | null;
	partnership_type?: string | null;
	description?: string | null;
}

export interface CongressPricingPeriod {
	/** @primaryKey */
	id: string;
	/** @description The congress this pricing period belongs to. @required */
	congress: Congress | string;
	sort?: number | null;
	/** @description E.g. Early bird @required */
	name: string;
	/** @description Last day of this period */
	ends_on?: string | null;
	/** @description First day of this period. Empty = the day after the previous period ends (or from when sales open, for the first period). */
	starts_on?: string | null;
}

export interface CongressPrivilegePerson {
	/** @primaryKey */
	id: number;
	congress_privilege?: CongressPrivilege | string | null;
	person?: Person | string | null;
}

export interface CongressPrivilege {
	/** @primaryKey */
	id: number;
	congress_id?: Congress | string | null;
	privileges_id?: Privilege | string | null;
	persons?: CongressPrivilegePerson[] | string[];
}

export interface CongressRegistrationGroup {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description The congress this group is attending. @required */
	congress: Congress | string;
	/** @description Cancelled means the arrangement is off. It doesn't cancel members' registrations. @required */
	status: 'active' | 'cancelled';
	/** @description The organisation or delegation name. @required */
	name: string;
	/** @description Who we deal with about this group. They don't have to attend. */
	contact_name?: string | null;
	/** @description Who we deal with about this group. They don't have to attend. */
	contact_email?: string | null;
	/** @description Badge type for every member. Empty = the usual default. */
	badge_type?: CongressBadgeType | string | null;
	/** @description What was agreed, e.g. rate, expected numbers, comps included. */
	note?: string | null;
	/** @description Checkouts staff made for this group. */
	bundles?: CongressOrderOwner[] | string[];
	/** @description Registrations in this group. */
	members?: CongressRegistration[] | string[];
}

export interface CongressRegistration {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description The congress this registration is for. @required */
	congress: Congress | string;
	/** @description Pending until the order is paid. @required */
	status: 'pending' | 'confirmed' | 'cancelled';
	/** @description Set when something needs a person to look. */
	needs_review?: boolean;
	/** @description Why this registration needs review. */
	review_reason?: string | null;
	/** @description The badge this attendee gets. */
	badge_type?: CongressBadgeType | string | null;
	/** @description Accompanying persons are never in a group. */
	group?: CongressRegistrationGroup | string | null;
	/** @description Accompanying persons only: the delegate they come with. */
	host_registration?: CongressRegistration | string | null;
	/** @description Linked if the attendee has an account. Optional. */
	user?: DirectusUser | string | null;
	/** @description Their details form answers. */
	submission?: FormSubmission | string | null;
	/** @description The import this registration came from, if any. */
	import_batch?: RegistrationImport | string | null;
	/** @description Their reference or old delegate number in the imported sheet. */
	import_ref?: string | null;
	/** @description Attendee's email address. */
	email?: string | null;
	/** @description E.g. Dr, Prof. */
	title?: string | null;
	/** @description Attendee's first name. */
	first_name?: string | null;
	/** @description Attendee's last name. */
	last_name?: string | null;
	/** @description Name as printed on the badge. */
	badge_name?: string | null;
	/** @description Hospital, university or company. */
	organisation_name?: string | null;
	/** @description Attendee's city. */
	city?: string | null;
	/** @description Attendee's country. */
	country?: string | null;
	/** @description Assigned on confirmation, never changed. Number only: one running sequence per congress, shared by all badge types. Shown with the badge type's prefix in front, e.g. FD + 12 = FD12. */
	delegate_no?: string | null;
	/** @description delegate_no as a whole number, used to find the next one. */
	delegate_seq?: number | null;
	/** @description When the attendee checked in at the congress. */
	checked_in_at?: string | null;
	/** @description Staff notes about this registration. */
	note?: string | null;
	/** @description Issued tickets for this registration: its admission ticket and any add-ons. */
	tickets?: CongressIssuedTicket[] | string[];
	/** @description Accompanying persons who come with this delegate. */
	accompanying?: CongressRegistration[] | string[];
}

export interface CongressSchedule {
	/** @primaryKey */
	id: string;
	status?: 'published' | 'draft' | 'archived';
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	day?: CongressDay | string | null;
	name?: string | null;
	parent?: CongressSchedule | string | null;
	preliminary?: boolean | null;
	sessions?: CongressSession[] | string[];
	breaks?: CongressBreak[] | string[];
}

export interface CongressSession {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	room?: VenueRoom | string | null;
	starttime?: string | null;
	endtime?: string | null;
	schedule?: CongressSchedule | string | null;
	title?: string | null;
	tags?: 'json' | null;
	events?: CongressEvent[] | string[];
	organisers?: CongressSessionsOrganisation[] | string[];
	rooms?: CongressSessionsVenueRoom[] | string[];
}

export interface CongressSessionsOrganisation {
	/** @primaryKey */
	id: number;
	session?: CongressSession | string | null;
	organisation?: Organisation | string | null;
	sort?: number | null;
}

export interface CongressSessionsVenueRoom {
	/** @primaryKey */
	id: number;
	session?: CongressSession | string | null;
	room?: VenueRoom | string | null;
}

export interface CongressSponsor {
	/** @primaryKey */
	id: number;
	congress?: Congress | string | null;
	sponsor?: Organisation | string | null;
	sort?: number | null;
	tier?: CongressSponsorTier | string | null;
}

export interface CongressSponsorTier {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	congress?: Congress | string | null;
	color?: string | null;
}

export interface CongressTicket {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	congress?: Congress | string | null;
	category?: 'registration' | 'accommodation' | `add-ons` | 'tours' | 'workshops' | null;
	charge?: CongressCharge | string | null;
}

export interface CongressVoucherCodeRedemption {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	voucher_code?: CongressVoucherCode | string | null;
}

export interface CongressVoucherCode {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	status?: 'active' | 'expired' | 'redeemed' | null;
	code?: string;
	redemption_limit?: number | null;
	type?: 'general' | 'personal';
	expires?: string | null;
	voucher?: CongressVoucher | string | null;
	user?: DirectusUser | string | null;
	redemptions?: CongressVoucherCodeRedemption[] | string[];
}

export interface CongressVoucher {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	description?: string | null;
	congress?: Congress | string | null;
	voucher_codes?: CongressVoucherCode[] | string[];
}

export interface Country {
	/** @primaryKey */
	id: 'AF' | 'AL' | 'DZ' | 'AD' | 'AO' | 'AG' | 'AR' | 'AM' | 'AU' | 'AT' | 'AZ' | 'BS' | 'BH' | 'BD' | 'BB' | 'BY' | 'BE' | 'BZ' | 'BJ' | 'BT' | 'BO' | 'BA' | 'BW' | 'BR' | 'BN' | 'BG' | 'BF' | 'BI' | 'KH' | 'CM' | 'CA' | 'CV' | 'CF' | 'TD' | 'CL' | 'CN' | 'CO' | 'KM' | 'CG' | 'CR' | 'HR' | 'CU' | 'CY' | 'CZ' | 'DK' | 'DJ' | 'DM' | 'DO' | 'TL' | 'EC' | 'EG' | 'SV' | 'GQ' | 'ER' | 'EE' | 'ET' | 'FJ' | 'FI' | 'FR' | 'GA' | 'GM' | 'GE' | 'DE' | 'GH' | 'GR' | 'GD' | 'GT' | 'GN' | 'GW' | 'GY' | 'HT' | 'HN' | 'HU' | 'IS' | 'IN' | 'ID' | 'IR' | 'IQ' | 'IE' | 'IL' | 'IT' | 'JM' | 'JP' | 'JO' | 'KZ' | 'KE' | 'KI' | 'KW' | 'KG' | 'LA' | 'LV' | 'LB' | 'LS' | 'LR' | 'LY' | 'LI' | 'LT' | 'LU' | 'MG' | 'MW' | 'MY' | 'MV' | 'ML' | 'MT' | 'MH' | 'MR' | 'MU' | 'MX' | 'FM' | 'MD' | 'MC' | 'MN' | 'ME' | 'MA' | 'MZ' | 'MM' | 'NA' | 'NR' | 'NP' | 'NL' | 'NZ' | 'NI' | 'NE' | 'NG' | 'MK' | 'NO' | 'OM' | 'PK' | 'PW' | 'PS' | 'PA' | 'PG' | 'PY' | 'PE' | 'PH' | 'PL' | 'PT' | 'QA' | 'RO' | 'RU' | 'RW' | 'KN' | 'LC' | 'VC' | 'WS' | 'SM' | 'ST' | 'SA' | 'SN' | 'RS' | 'SC' | 'SL' | 'SG' | 'SK' | 'SI' | 'SB' | 'SO' | 'ZA' | 'KR' | 'SS' | 'ES' | 'LK' | 'SD' | 'SR' | 'SE' | 'CH' | 'SY' | 'TW' | 'TJ' | 'TZ' | 'TH' | 'TG' | 'TO' | 'TT' | 'TN' | 'TR' | 'TM' | 'TV' | 'UG' | 'UA' | 'AE' | 'GB' | 'US' | 'UY' | 'UZ' | 'VU' | 'VA' | 'VE' | 'VN' | 'YE' | 'ZM' | 'ZW';
	flag?: DirectusFile | string | null;
}

export interface CountryTravelInfo {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	country?: Country | string | null;
	venue?: Venue | string | null;
	details?: string | null;
	link?: string | null;
}

export interface DecisionRequestDefinition {
	/** @primaryKey */
	id: string;
	name?: string;
	flow?: DirectusFlow | string;
	expires_in?: number | null;
	allow_change?: boolean | null;
	options?: Array<{ value: string; label: string; message: string }> | null;
	definition?: DecisionRequestDefinition | string | null;
}

export interface DecisionRequest {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	token_hash?: string;
	recipient_user?: DirectusUser | string | null;
	recipient_email?: string | null;
	chosen_option?: string | null;
	decided_at?: string | null;
	expires_at?: string | null;
	superseded_at?: string | null;
}

export interface EmailCampaign {
	/** @primaryKey */
	id: number;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	subject?: string | null;
	preview?: string | null;
	sender_name?: string | null;
	sender_email?: string | null;
	template?: EmailTemplate | string | null;
	sent?: string | null;
	scheduled?: string | null;
}

export interface EmailCampaignSend {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	campaign?: EmailCampaign | string | null;
	recipient?: DirectusUser | string | null;
}

export interface EmailTemplate {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	template?: string | null;
	design?: Record<string, any> | null;
	decisions?: DecisionRequestDefinition | string | null;
}

export interface FormField {
	/** @primaryKey */
	id: string;
	/** @description Unique field identifier, not shown to users (lowercase, hyphenated) */
	name?: string | null;
	/** @description Input type for the field */
	type?: 'text' | 'textarea' | 'checkbox' | 'checkbox_group' | 'checkbox_group_alt' | 'radio' | 'file' | 'select' | 'hidden' | 'voucher' | 'address' | 'phone' | 'policy' | null;
	/** @description Text label shown to form users. */
	label?: string | null;
	/** @description Default text shown in empty input. */
	placeholder?: string | null;
	/** @description Additional instructions shown below the input */
	help?: string | null;
	/** @description Available rules: `email`, `url`, `min:5`, `max:20`, `length:10`. Combine with pipes example: `email|max:255` */
	validation?: string | null;
	/** @description Field width on the form */
	width?: '100' | '67' | '50' | '33' | null;
	/** @description Options for radio or select inputs */
	choices?: Array<{ text: string; value: string }> | null;
	/** @description Parent form this field belongs to. */
	form?: Form | string | null;
	sort?: number | null;
	/** @description Make this field mandatory to complete. */
	required?: boolean | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	/** @description Prepopulate field with logged in user data. Field name must match a field in directus user collection. */
	use_user_data?: boolean | null;
	policy?: Policy | string | null;
}

export interface FormFlowField {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description Unique field identifier, not shown to users (lowercase, hyphenated) */
	name?: string | null;
	/** @description Text label shown to form users. */
	label?: string | null;
	/** @description Input type for the field */
	type?: 'text' | 'textarea' | 'checkbox' | 'checkbox_group' | 'checkbox_group_alt' | 'radio' | 'file' | 'select' | 'hidden' | 'voucher' | null;
	/** @description Options for radio or select inputs */
	choices?: Array<{ text: string; value: string }> | null;
	/** @description Default text shown in empty input. */
	placeholder?: string | null;
	/** @description Additional instructions shown below the input */
	help?: string | null;
	/** @description Make this field mandatory to complete. */
	required?: boolean | null;
	/** @description Available rules: `email`, `url`, `min:5`, `max:20`, `length:10`. Combine with pipes example: `email|max:255` */
	validation?: string | null;
	/** @description Field width on the form */
	width?: '100' | '67' | '50' | '33' | null;
	/** @description Prepopulate field with logged in user data. Field name must match a field in directus user collection. */
	use_user_data?: boolean | null;
	step?: FormFlowStep | string | null;
	/** @description Toggles whether to display a button to copy the field value to clipboard. */
	copy?: boolean | null;
	/** @description Makes the field readonly, can be used to display pre-filled values to user but prevent them from editing. */
	readonly?: boolean | null;
}

export interface FormFlow {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	key?: string;
	site?: Site | string | null;
	show_steps?: boolean | null;
	title?: string | null;
	/** @description Show or hide this form from the site. */
	is_active?: boolean | null;
	/** @description Setup email notifications when forms are submitted. */
	emails?: Array<{ to: string[]; subject: string; message: string }> | null;
	/** @description Text shown on submit button. */
	submit_label?: string | null;
	/** @description Action after successful submission. */
	on_success?: 'redirect' | 'message' | null;
	/** @description Message shown after successful submission. */
	success_message?: string | null;
	/** @description Destination URL after successful submission. */
	success_redirect?: string | null;
	show_summary?: boolean | null;
	bot_protection?: boolean | null;
	steps?: FormFlowStep[] | string[];
	submissions?: FormFlowSubmission[] | string[];
}

export interface FormFlowStepCondition {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	logical_operator?: 'AND' | 'OR';
	next_step?: FormFlowStep | string | null;
	step?: FormFlowStep | string | null;
	name?: string | null;
	sort?: number | null;
	rules?: FormFlowStepRule[] | string[];
}

export interface FormFlowStepRule {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	operator?: '_eq' | '_neq' | '_null' | '_nnull' | null;
	value?: string | null;
	condition?: FormFlowStepCondition | string | null;
	field?: FormFlowField | string | null;
}

export interface FormFlowStep {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	flow?: FormFlow | string | null;
	description?: string | null;
	advance_message?: string | null;
	conditions?: FormFlowStepCondition[] | string[];
	fields?: FormFlowField[] | string[];
}

export interface FormFlowSubmission {
	/** @primaryKey */
	id: string;
	/** @description Form submission date and time. */
	timestamp?: string | null;
	flow?: FormFlow | string | null;
	user_created?: DirectusUser | string | null;
	values?: FormFlowSubmissionValue[] | string[];
}

export interface FormFlowSubmissionValue {
	/** @primaryKey */
	id: string;
	/** @description The data entered by the user for this specific field in the form submission. */
	value?: string | null;
	field?: FormFlowField | string | null;
	sort?: number | null;
	file?: DirectusFile | string | null;
	form_submission?: FormFlowSubmission | string | null;
	/** @description Form submission date and time. */
	timestamp?: string | null;
}

export interface Form {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description Form name (for internal reference). */
	title?: string | null;
	/** @description Show or hide this form from the site. */
	is_active?: boolean | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	/** @description Action after successful submission. */
	on_success?: 'redirect' | 'message' | null;
	/** @description Text shown on submit button. */
	submit_label?: string | null;
	/** @description Message shown after successful submission. */
	success_message?: string | null;
	/** @description Destination URL after successful submission. */
	success_redirect_url?: string | null;
	/** @description Setup email notifications when forms are submitted. */
	emails?: Array<{ to: string[]; subject: string; message: string }> | null;
	site?: Site | string | null;
	bot_protection?: boolean | null;
	/** @description Received form responses. */
	submissions?: FormSubmission[] | string[];
	/** @description Form structure and input fields */
	fields?: FormField[] | string[];
}

export interface FormSubmission {
	/** @description Unique ID for this specific form submission @primaryKey */
	id: string;
	/** @description Form submission date and time. */
	timestamp?: string | null;
	/** @description Associated form for this submission. */
	form?: Form | string | null;
	user_created?: DirectusUser | string | null;
	/** @description Submitted field responses */
	values?: FormSubmissionValue[] | string[];
}

export interface FormSubmissionValue {
	/** @primaryKey */
	id: string;
	/** @description Parent form submission for this value. */
	form_submission?: FormSubmission | string | null;
	field?: FormField | string | null;
	/** @description The data entered by the user for this specific field in the form submission. */
	value?: string | null;
	sort?: number | null;
	file?: DirectusFile | string | null;
	/** @description Form submission date and time. */
	timestamp?: string | null;
}

export interface Globals {
	/** @description Site summary for search results. */
	description?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Social media profile URLs */
	social_links?: Array<{ url: string; service: 'facebook' | 'instagram' | 'linkedin' | 'x' | 'vimeo' | 'youtube' | 'github' | 'discord' | 'docker' }> | null;
	/** @description Short phrase describing the site. */
	tagline?: string | null;
	/** @description Main site title */
	title?: string | null;
	/** @description Public URL for the website */
	url?: string | null;
	/** @description Small icon for browser tabs. 1:1 ratio. No larger than 512px × 512px. */
	favicon?: DirectusFile | string | null;
	/** @description Main logo shown on the site (for light mode). */
	logo?: DirectusFile | string | null;
	/** @description Main logo shown on the site (for dark mode). */
	logo_dark_mode?: DirectusFile | string | null;
	/** @description Accent color for the website (used on buttons, links, etc). */
	accent_color?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	/** @description Secret OpenAI API key. Don't share with anyone outside your team. */
	openai_api_key?: string | null;
	/** @description The public URL for this Directus instance. Used in Flows. */
	directus_url?: string | null;
	current_congress?: 'json' | null;
}

export interface Hotel {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string;
	star_rating?: number;
	ammenities?: Array<'Bar' | `Business Travel Center` | `Meeting Room` | 'Gym' | `Swimming Pool` | `Recreational Facilities` | `Café`> | null;
	rooms?: number | null;
	location?: string | null;
	website?: string | null;
	phone?: string | null;
	address?: string | null;
	image?: DirectusFile | string | null;
	congresses?: CongressHotel[] | string[];
}

export interface IssueComment {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	issue?: Issue | string | null;
	author?: DirectusUser | string | null;
	body?: string | null;
	parent?: IssueComment | string | null;
	children?: IssueComment[] | string[];
}

export interface Issue {
	/** @primaryKey */
	id: string;
	status?: 'published' | 'draft' | 'archived';
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	site?: Site | string | null;
	title?: string | null;
	priority?: string | null;
	type?: string | null;
	description?: string | null;
	reporter?: DirectusUser | string | null;
	comments?: IssueComment[] | string[];
}

export interface Language {
	/** @primaryKey */
	code: string;
	name?: string | null;
	direction?: 'ltr' | 'rtl' | null;
	sort?: number | null;
}

export interface Navigation {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	is_active?: boolean | null;
	site?: Site | string | null;
	key?: string | null;
	items?: NavigationItem[] | string[];
}

export interface NavigationItem {
	/** @primaryKey */
	id: string;
	/** @description The internal page to link to. */
	page?: Page | string | null;
	/** @description The parent navigation item. */
	parent?: NavigationItem | string | null;
	sort?: number | null;
	/** @description Label shown to the user for the menu item. @required */
	title: string;
	/** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Group can contain other menu items. */
	type?: 'page' | 'post' | 'url' | 'group' | null;
	/** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://docs.directus.io`) */
	url?: string | null;
	/** @description The internal post to link to. */
	post?: Post | string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	navigation?: Navigation | string | null;
	/** @description Add child menu items within the group. */
	children?: NavigationItem[] | string[];
	translations?: NavigationItemsTranslation[] | null;
}

export interface NavigationItemsTranslation {
	/** @primaryKey */
	id: number;
	navigation_items_id?: NavigationItem | string | null;
	languages_code?: Language | string | null;
	title?: string | null;
}

export interface OrganisationPerson {
	/** @primaryKey */
	id: number;
	organisation?: Organisation | string | null;
	person?: Person | string | null;
	sort?: number | null;
	role?: string | null;
	responsibilities?: string[] | null;
}

export interface Organisation {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	short_name?: string | null;
	abbr?: string | null;
	email?: string | null;
	phone?: string | null;
	website?: string | null;
	address?: string | null;
	logo?: DirectusFile | string | null;
	type?: `APOA Core` | 'apoa_sections' | 'sponsors' | 'noa';
	description?: string | null;
	people?: OrganisationPerson[] | string[];
	sponsor_details?: Sponsor[] | string[];
	apoa_section_details?: ApoaSection[] | string[];
	users?: OrganisationsUser[] | string[];
}

export interface OrganisationsUser {
	/** @primaryKey */
	id: number;
	user?: DirectusUser | string | null;
	organisation?: Organisation | string | null;
	sort?: number | null;
	role?: string | null;
}

export interface PageBlock {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description The id of the page that this block belongs to. */
	page?: Page | string | null;
	/** @description The data for the block. */
	item?: BlockHero | BlockRichtext | BlockForm | BlockPost | BlockGallery | BlockPricing | BlockPeople | BlockMainhero | BlockSponsor | BlockMessage | BlockChargetable | BlockFormFlow | BlockAccordion | string | null;
	/** @description The collection (type of block). */
	collection?: string | null;
	/** @description Temporarily hide this block on the website without having to remove it from your page. */
	hide_block?: boolean | null;
	/** @description Background color for the block to create contrast. Does not control dark or light mode for the entire site. */
	background?: 'light' | 'dark' | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
}

export interface Page {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	/** @description The title of this page. @required */
	title: string;
	/** @description Unique URL for this page (start with `/`, can have multiple segments `/about/me`)). @required */
	permalink: string;
	/** @description Is this page published? */
	status?: 'draft' | 'in_review' | 'published';
	/** @description Publish now or schedule for later. */
	published_at?: string | null;
	seo?: ExtensionSeoMetadata | null;
	site?: Site | string | null;
	/** @description Create and arrange different content blocks (like text, images, or videos) to build your page. */
	blocks?: PageBlock[] | string[];
}

export interface PeopleList {
	/** @primaryKey */
	id: string;
	status?: 'published' | 'draft' | 'archived';
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	congress?: Congress | string | null;
	headline?: string | null;
	tagline?: string | null;
	type?: 'people' | 'events' | 'assignments' | null;
	events?: PeopleListCongressEvent[] | string[];
	assignments?: PeopleListAssignment[] | string[];
	entry?: PeopleListEntry[] | string[];
}

export interface PeopleListAssignment {
	/** @primaryKey */
	id: number;
	people_list_id?: PeopleList | string | null;
	assignments_id?: Assignment | string | null;
}

export interface PeopleListCongressEvent {
	/** @primaryKey */
	id: number;
	people_list_id?: PeopleList | string | null;
	congress_events_id?: CongressEvent | string | null;
}

export interface PeopleListEntry {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	person?: Person | string | null;
	extra1?: string | null;
	extra2?: string | null;
	list?: PeopleList | string | null;
}

export interface PeopleListPerson {
	/** @primaryKey */
	id: number;
	people_list_id?: PeopleList | string | null;
	persons_id?: Person | string | null;
	sort?: number | null;
}

export interface Person {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	first_name?: string | null;
	last_name?: string;
	title?: 'Dr' | null;
	qualifications?: Array<'PhD' | 'md'> | null;
	country?: 'json' | null;
	bio?: string | null;
	image?: DirectusFile | string | null;
	affiliations?: Array<{ institution: string; link: string; position: string }> | null;
	email?: string | null;
	organisations?: OrganisationPerson[] | string[];
	committee_positions?: PersonsCommitteePosition[] | string[];
	assignments?: Assignment[] | string[];
}

export interface PersonsCommitteePosition {
	/** @primaryKey */
	id: number;
	persons_id?: Person | string | null;
	committee_positions_id?: CommitteePosition | string | null;
}

export interface Policy {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	type?: 'privacy' | 'terms_of_service' | null;
	name?: string | null;
	/** @description Short text displayed in privacy policy consent message. */
	notification?: string | null;
	content?: string | null;
	required?: boolean | null;
	default?: boolean | null;
	show_on_login?: boolean;
	key?: string;
	sites?: SitesPolicy[] | string[];
}

export interface Post {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
	/** @description Rich text content of your blog post. */
	content?: string | null;
	/** @description Featured image for this post. Used in cards linking to the post and in the post detail page. */
	image?: DirectusFile | string | null;
	/** @description Unique URL for this post (e.g., `yoursite.com/posts/{{your-slug}}`) */
	slug?: string | null;
	/** @description Is this post published? */
	status?: 'draft' | 'in_review' | 'published';
	/** @description Title of the blog post (used in page title and meta tags) @required */
	title: string;
	/** @description Short summary of the blog post to entice readers. */
	description?: string | null;
	/** @description Select the team member who wrote this post */
	author?: DirectusUser | string | null;
	/** @description Publish now or schedule for later. */
	published_at?: string | null;
	seo?: ExtensionSeoMetadata | null;
}

export interface Privilege {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	description?: string | null;
	name?: string | null;
	congresses?: CongressPrivilege[] | string[];
}

export interface Redirect {
	/** @primaryKey */
	id: string;
	response_code?: '301' | '302' | null;
	/** @description Old URL has to be relative to the site (ie `/blog` or `/news`). It cannot be a full url like (https://example.com/blog) */
	url_from?: string | null;
	/** @description The URL you're redirecting to. This can be a relative url (/resources/matt-is-cool) or a full url (https://example.com/blog). */
	url_to?: string | null;
	/** @description Short explanation of why the redirect was created. */
	note?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	date_updated?: string | null;
	user_updated?: DirectusUser | string | null;
}

export interface RegistrationImport {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description The congress these registrations are for. @required */
	congress: Congress | string;
	/** @description The spreadsheet that was imported. */
	file?: DirectusFile | string | null;
	/** @description Number of rows in the imported sheet. */
	row_count?: number | null;
	/** @description Anything worth knowing about this import. */
	note?: string | null;
	/** @description Comp: everyone got the Complimentary ticket. Paid elsewhere: each row's own ticket type. */
	kind?: 'comp' | 'paid_elsewhere' | null;
	/** @description The group everyone in this import joined, if any. */
	group?: CongressRegistrationGroup | string | null;
	/** @description Name of the uploaded CSV. */
	file_name?: string | null;
	/** @description One entry per row in the file: what happened to it. */
	results?: Record<string, any> | null;
	/** @description Registrations created by this import. */
	registrations?: CongressRegistration[] | string[];
}

export interface Role {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	name?: string | null;
	assignments?: Assignment[] | string[];
}

export interface ScheduleChange {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	operation?: 'create' | 'update' | 'delete' | null;
	changes?: Array<{ field: string; type: 'string' | 'relational'; old_value: 'json'; new_value: 'json' }> | null;
	schedule?: CongressSchedule | string | null;
	type?: ScheduleChangesType[] | string[];
}

export interface ScheduleChangesType {
	/** @primaryKey */
	id: number;
	schedule_change?: ScheduleChange | string | null;
	item?: Assignment | CongressEvent | CongressSession | CongressBreak | string | null;
	collection?: string | null;
}

export interface ScientificTag {
	/** @primaryKey */
	id: string;
	tag?: string | null;
	color?: string | null;
}

export interface SiteBranding {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	primary?: string | null;
	secondary?: string | null;
	accent?: string | null;
	dark?: string | null;
	light?: string | null;
	style_guide?: DirectusFile | string | null;
	site?: Site | string | null;
	font_heading?: Array<{ family: string; fallback: string; weight: string; style: string; source: string; url: string }> | null;
	font_default?: Array<{ family: string; fallback: string; weight: string; style: string; source: string; url: string }> | null;
	color_schemes?: Array<{ name: string; colors: Array<{ name: string; color: string }> }> | null;
	assets?: SiteBrandingAsset[] | string[];
}

export interface SiteBrandingAssetFile {
	/** @primaryKey */
	id: number;
	site_branding_assets_id?: SiteBrandingAsset | string | null;
	file?: DirectusFile | string | null;
	is_default?: boolean | null;
	variant_label?: string | null;
}

export interface SiteBrandingAsset {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	site_branding?: SiteBranding | string | null;
	name?: string | null;
	category?: 'apoa_logos' | 'congress_logos' | 'favicons' | 'banners' | 'social_media' | 'templates' | 'print' | 'icons' | null;
	assets?: SiteBrandingAssetFile[] | string[];
}

export interface Site {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	/** @description Main site title */
	title?: string | null;
	/** @description Public URL for the website */
	url?: string | null;
	/** @description Short phrase describing the site. */
	tagline?: string | null;
	/** @description Site summary for search results. */
	description?: string | null;
	/** @description Social media profile URLs */
	social_links?: Array<{ url: string; service: 'facebook' | 'instagram' | 'linkedin' | 'x' | 'vimeo' | 'youtube' | 'github' | 'discord' | 'docker' }> | null;
	logo?: DirectusFile | string | null;
	logo_dark_mode?: DirectusFile | string | null;
	favicon?: DirectusFile | string | null;
	preview?: boolean | null;
	users?: DirectusUser | string | null;
	support_form?: Form | string | null;
	header_template?: EmailTemplate | string | null;
	footer_template?: EmailTemplate | string | null;
	checkout_form?: Form | string | null;
	maintenance_mode?: boolean | null;
	maintenance_message?: string | null;
	user_policies?: SitesPolicy[] | string[];
	navigation?: Navigation[] | string[];
	form_flows?: FormFlow[] | string[];
	congress?: Congress[] | string[];
	branding?: SiteBranding[] | string[];
	pages?: Page[] | string[];
}

export interface SitesPolicy {
	/** @primaryKey */
	id: number;
	site?: Site | string | null;
	policy?: Policy | string | null;
}

export interface Sponsor {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	organisation?: Organisation | string;
}

export interface SupportCase {
	/** @primaryKey */
	id: string;
	status?: 'new' | 'open' | 'in_progress' | 'pending' | 'escalated' | 'on_hold' | 'resolved' | 'closed' | 'cancelled';
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	customer?: DirectusUser | string | null;
	agent?: DirectusUser | string | null;
	customer_email?: string | null;
	category?: 'billing' | 'general' | `abstract submission` | 'registration' | 'accommodation' | 'speakers' | 'travel' | `website issues` | `exhibitors and sponsors` | `apoa membership` | null;
	form_submission?: FormSubmission | string | null;
	customer_first_name?: string | null;
	customer_last_name?: string | null;
	summary?: string | null;
	folder?: DirectusFolder | string | null;
	site?: Site | string | null;
	messages?: CaseMessage[] | string[];
}

export interface TicketTailorBundle {
	/** @description Bundle ID, e.g. bu_108419. @primaryKey */
	id: string;
	/** @description Always "bundle". */
	object?: string;
	/** @description The event series the bundle was created for (the :event_series_id in Ticket Tailor's URL). */
	event_series_id?: string | null;
	/** @description Bundle status. */
	status?: 'ON_SALE' | 'HIDDEN' | 'UNAVAILABLE' | 'SOLD_OUT' | 'ADMIN_ONLY' | 'LOCKED' | null;
	/** @description Bundle name. */
	name?: string | null;
	/** @description Bundle description. */
	description?: string | null;
	/** @description Price in cents. */
	price?: number | null;
	/** @description Booking fee in cents. */
	booking_fee?: number | null;
	/** @description Code to access a bundle. */
	access_code?: string | null;
	/** @description Bundle group ID. */
	group_id?: string | null;
	/** @description Ticket types in the bundle. */
	ticket_types?: Record<string, any> | null;
	/** @description Products in the bundle. */
	products?: Record<string, any> | null;
}

export interface TicketTailorIssuedTicket {
	/** @description Issued ticket ID, e.g. it_123456789. @primaryKey */
	id: string;
	/** @description Always "issued_ticket". */
	object?: string;
	/** @description valid or voided. */
	status?: 'valid' | 'voided';
	/** @description Where the ticket came from; "api" for these. */
	source?: string | null;
	/** @description Event occurrence ID (ev_...). */
	event_id?: string | null;
	/** @description Event series ID (es_...). */
	event_series_id?: string | null;
	/** @description Ticket type ID (tt_...). */
	ticket_type_id?: string | null;
	/** @description Hold the ticket was created from, if any. */
	hold_id?: string | null;
	/** @description Always empty: tickets issued this way have no order. */
	order_id?: string | null;
	/** @description Ticket type name. */
	description?: string | null;
	/** @description The full name of the person attending the event. */
	full_name?: string | null;
	/** @description First part of full_name. */
	first_name?: string | null;
	/** @description Rest of full_name. */
	last_name?: string | null;
	/** @description The email of the person attending the event. */
	email?: string | null;
	/** @description Ticket code (given, or generated). */
	barcode?: string | null;
	/** @description External reference, e.g. an order number in another system. */
	reference?: string | null;
	/** @description Ticket type price in cents (from its charge). */
	listed_price?: number | null;
	/** @description What the caller asked for. The sandbox never sends email. */
	send_email?: boolean | null;
	/** @description Unix seconds. */
	created_at?: number | null;
	/** @description Unix seconds, when voided. */
	voided_at?: number | null;
}

export interface TicketTailorOrder {
	/** @description A unique identifier for the order (e.g. or_12345678). @primaryKey @required */
	id: string;
	/** @description Always "order". */
	object?: string;
	/** @description Possible states of the order: completed, pending, cancelled. @required */
	status: 'completed' | 'pending' | 'cancelled';
	/** @description Message associated with status. */
	status_message?: string | null;
	/** @description Order creation timestamp (Unix seconds). @required */
	created_at: number;
	/** @description A unique identifier for the transaction. */
	txn_id?: string | null;
	/** @description Buyer details object: name, first_name, last_name, email, phone, address, custom_questions. @required */
	buyer_details: Record<string, any>;
	/** @description Currency object, e.g. { "code": "usd", "base_multiplier": 100 }. @required */
	currency: Record<string, any>;
	/** @description Event summary object: id, event_id, event_series_id, name, start_date, end_date, venue. */
	event_summary?: Record<string, any> | null;
	/** @description Issued ticket objects (nullable). */
	issued_tickets?: Record<string, any> | null;
	/** @description Sold product objects (nullable). */
	sold_products?: Record<string, any> | null;
	/** @description Line item objects. The bundle is the one with type "bundle"; its item_id is the bundle ID. @required */
	line_items: Record<string, any>;
	/** @description Payment method object: id, type, name, external_id, instructions, ... @required */
	payment_method: Record<string, any>;
	/** @description Meta data objects. */
	meta_data?: Record<string, any> | null;
	/** @description Sum without tax (cents). @required */
	subtotal: number;
	/** @description Tax sum (cents). @required */
	tax: number;
	/** @description How tax was calculated: exclusive or inclusive. */
	tax_treatment?: 'exclusive' | 'inclusive' | null;
	/** @description Total value of order (cents). @required */
	total: number;
	/** @description Total amount paid for this order including tax (cents). @required */
	total_paid: number;
	/** @description Refunded amount in cents. @required */
	refund_amount: number;
	/** @description Refunded amount issued as credit in cents. */
	credited_out_amount?: number | null;
	/** @description The unique identifier for the existing voucher. */
	refunded_voucher_id?: number | null;
	/** @description A unique tag to track where sales originated. */
	referral_tag?: string | null;
	/** @description Whether the buyer opted in to receive marketing emails. */
	marketing_opt_in?: string | null;
	/** @description Notes attached to the order. */
	notes?: string | null;
}

export interface TTAHtmltemplate {
	/** @primaryKey */
	id: number;
	description?: string | null;
	collection?: string | null;
	name?: string | null;
	header?: string | null;
	template?: string | null;
	footer?: string | null;
	format?: string | null;
	orientation?: string | null;
	input_type?: string | null;
	input_flow?: string | null;
	input_flow_body?: string | null;
	input_fixed?: string | null;
}

export interface UserPolicyAgreement {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	consent?: boolean | null;
	user?: DirectusUser | string | null;
	policy?: Policy | string | null;
	active?: boolean | null;
	version?: DirectusVersion | string | null;
}

export interface VenueRoom {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	venue?: Venue | string | null;
	title?: string | null;
	floor?: string | null;
	capacity?: number | null;
	official_name?: string | null;
	sessions?: CongressSession[] | string[];
}

export interface Venue {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	title?: string | null;
	location?: string | null;
	website?: string | null;
	visa_link?: string | null;
	visa_general_info?: string | null;
	travel_general_info?: string | null;
	airport_codes?: Array<'TPE'> | null;
	visa_info_by_country?: VenueVisaInfo[] | string[];
	travel_info_by_country?: CountryTravelInfo[] | string[];
	congress?: Congress[] | string[];
	rooms?: VenueRoom[] | string[];
}

export interface VenueVisaInfo {
	/** @primaryKey */
	id: string;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	user_updated?: DirectusUser | string | null;
	date_updated?: string | null;
	venue?: Venue | string | null;
	details?: string | null;
	link?: string | null;
	countries?: VenueVisaInfoCountry[] | string[];
}

export interface VenueVisaInfoCountry {
	/** @primaryKey */
	id: number;
	venue_visa_info?: VenueVisaInfo | string | null;
	country?: Country | string | null;
}

export interface DirectusAccess {
	/** @primaryKey */
	id: string;
	role?: DirectusRole | string | null;
	user?: DirectusUser | string | null;
	policy?: DirectusPolicy | string;
	sort?: number | null;
}

export interface DirectusActivity {
	/** @primaryKey */
	id: number;
	action?: string;
	user?: DirectusUser | string | null;
	timestamp?: string;
	ip?: string | null;
	user_agent?: string | null;
	collection?: string;
	item?: string;
	origin?: string | null;
	revisions?: DirectusRevision[] | string[];
}

export interface DirectusCollection {
	/** @primaryKey */
	collection: string;
	icon?: string | null;
	note?: string | null;
	display_template?: string | null;
	hidden?: boolean;
	singleton?: boolean;
	translations?: Array<{ language: string; translation: string; singular: string; plural: string }> | null;
	archive_field?: string | null;
	archive_app_filter?: boolean;
	archive_value?: string | null;
	unarchive_value?: string | null;
	sort_field?: string | null;
	accountability?: 'all' | 'activity' | null | null;
	color?: string | null;
	item_duplication_fields?: 'json' | null;
	sort?: number | null;
	group?: DirectusCollection | string | null;
	collapse?: string;
	preview_url?: string | null;
	versioning?: boolean;
}

export interface DirectusComment {
	/** @primaryKey */
	id: string;
	collection?: DirectusCollection | string;
	item?: string;
	comment?: string;
	date_created?: string | null;
	date_updated?: string | null;
	user_created?: DirectusUser | string | null;
	user_updated?: DirectusUser | string | null;
}

export interface DirectusField {
	/** @primaryKey */
	id: number;
	collection?: DirectusCollection | string;
	field?: string;
	special?: string[] | null;
	interface?: string | null;
	options?: 'json' | null;
	display?: string | null;
	display_options?: 'json' | null;
	readonly?: boolean;
	hidden?: boolean;
	sort?: number | null;
	width?: string | null;
	translations?: 'json' | null;
	note?: string | null;
	conditions?: 'json' | null;
	required?: boolean | null;
	group?: DirectusField | string | null;
	validation?: 'json' | null;
	validation_message?: string | null;
	searchable?: boolean;
}

export interface DirectusFile {
	/** @primaryKey */
	id: string;
	storage?: string;
	filename_disk?: string | null;
	filename_download?: string;
	title?: string | null;
	type?: string | null;
	folder?: DirectusFolder | string | null;
	uploaded_by?: DirectusUser | string | null;
	created_on?: string;
	modified_by?: DirectusUser | string | null;
	modified_on?: string;
	charset?: string | null;
	filesize?: number | null;
	width?: number | null;
	height?: number | null;
	duration?: number | null;
	embed?: string | null;
	description?: string | null;
	location?: string | null;
	tags?: string[] | null;
	metadata?: 'json' | null;
	focal_point_x?: number | null;
	focal_point_y?: number | null;
	tus_id?: string | null;
	tus_data?: 'json' | null;
	uploaded_on?: string | null;
}

export interface DirectusFolder {
	/** @primaryKey */
	id: string;
	name?: string;
	parent?: DirectusFolder | string | null;
	TTA_VIRUSSCAN_ENABLED?: boolean | null;
}

export interface DirectusMigration {
	/** @primaryKey */
	version: string;
	name?: string;
	timestamp?: string | null;
}

export interface DirectusPermission {
	/** @primaryKey */
	id: number;
	collection?: string;
	action?: string;
	permissions?: 'json' | null;
	validation?: 'json' | null;
	presets?: 'json' | null;
	fields?: string[] | null;
	policy?: DirectusPolicy | string;
}

export interface DirectusPolicy {
	/** @primaryKey */
	id: string;
	/** @required */
	name: string;
	icon?: string;
	description?: string | null;
	ip_access?: string[] | null;
	enforce_tfa?: boolean;
	admin_access?: boolean;
	app_access?: boolean;
	permissions?: DirectusPermission[] | string[];
	users?: DirectusAccess[] | string[];
	roles?: DirectusAccess[] | string[];
}

export interface DirectusPreset {
	/** @primaryKey */
	id: number;
	bookmark?: string | null;
	user?: DirectusUser | string | null;
	role?: DirectusRole | string | null;
	collection?: string | null;
	search?: string | null;
	layout?: string | null;
	layout_query?: 'json' | null;
	layout_options?: 'json' | null;
	refresh_interval?: number | null;
	filter?: 'json' | null;
	icon?: string | null;
	color?: string | null;
}

export interface DirectusRelation {
	/** @primaryKey */
	id: number;
	many_collection?: string;
	many_field?: string;
	one_collection?: string | null;
	one_field?: string | null;
	one_collection_field?: string | null;
	one_allowed_collections?: string[] | null;
	junction_field?: string | null;
	sort_field?: string | null;
	one_deselect_action?: string;
}

export interface DirectusRevision {
	/** @primaryKey */
	id: number;
	activity?: DirectusActivity | string;
	collection?: string;
	item?: string;
	data?: 'json' | null;
	delta?: 'json' | null;
	parent?: DirectusRevision | string | null;
	version?: DirectusVersion | string | null;
}

export interface DirectusRole {
	/** @primaryKey */
	id: string;
	/** @required */
	name: string;
	icon?: string;
	description?: string | null;
	parent?: DirectusRole | string | null;
	children?: DirectusRole[] | string[];
	policies?: DirectusAccess[] | string[];
	users?: DirectusUser[] | string[];
}

export interface DirectusSession {
	/** @primaryKey */
	token: string;
	user?: DirectusUser | string | null;
	expires?: string;
	ip?: string | null;
	user_agent?: string | null;
	share?: DirectusShare | string | null;
	origin?: string | null;
	next_token?: string | null;
}

export interface DirectusSettings {
	/** @primaryKey */
	id: number;
	project_name?: string;
	project_url?: string | null;
	project_color?: string;
	project_logo?: DirectusFile | string | null;
	public_foreground?: DirectusFile | string | null;
	public_background?: DirectusFile | string | null;
	public_note?: string | null;
	auth_login_attempts?: number | null;
	auth_password_policy?: null | `/^.{8,}$/` | `/(?=^.{8,}$)(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+}{';'?>.<,])(?!.*\\s).*$/` | null;
	storage_asset_transform?: 'all' | 'none' | 'presets' | null;
	storage_asset_presets?: Array<{ key: string; fit: 'contain' | 'cover' | 'inside' | 'outside'; width: number; height: number; quality: number; withoutEnlargement: boolean; format: 'auto' | 'jpeg' | 'png' | 'webp' | 'tiff' | 'avif'; transforms: 'json' }> | null;
	custom_css?: string | null;
	storage_default_folder?: DirectusFolder | string | null;
	basemaps?: Array<{ name: string; type: 'raster' | 'tile' | 'style'; url: string; tileSize: number; attribution: string }> | null;
	mapbox_key?: string | null;
	module_bar?: 'json' | null;
	project_descriptor?: string | null;
	default_language?: string;
	custom_aspect_ratios?: Array<{ text: string; value: number }> | null;
	public_favicon?: DirectusFile | string | null;
	default_appearance?: 'auto' | 'light' | 'dark';
	default_theme_light?: string | null;
	theme_light_overrides?: 'json' | null;
	default_theme_dark?: string | null;
	theme_dark_overrides?: 'json' | null;
	report_error_url?: string | null;
	report_bug_url?: string | null;
	report_feature_url?: string | null;
	public_registration?: boolean;
	public_registration_verify_email?: boolean;
	public_registration_role?: DirectusRole | string | null;
	public_registration_email_filter?: 'json' | null;
	visual_editor_urls?: Array<{ url: string }> | null;
	project_id?: string | null;
	mcp_enabled?: boolean;
	mcp_allow_deletes?: boolean;
	mcp_prompts_collection?: string | null;
	mcp_system_prompt_enabled?: boolean;
	mcp_system_prompt?: string | null;
	project_owner?: string | null;
	project_usage?: string | null;
	org_name?: string | null;
	product_updates?: boolean | null;
	project_status?: string | null;
	ai_openai_api_key?: string | null;
	ai_anthropic_api_key?: string | null;
	ai_system_prompt?: string | null;
	ai_google_api_key?: string | null;
	ai_openai_compatible_api_key?: string | null;
	ai_openai_compatible_base_url?: string | null;
	ai_openai_compatible_name?: string | null;
	ai_openai_compatible_models?: Array<{ id: string; name: string; context: number; output: number; attachment: boolean; reasoning: boolean; providerOptions: Record<string, any> }> | null;
	ai_openai_compatible_headers?: Array<{ header: string; value: string }> | null;
	ai_openai_allowed_models?: Array<`gpt-4o-mini` | `gpt-4.1-nano` | `gpt-4.1-mini` | `gpt-4.1` | `gpt-5-nano` | `gpt-5-mini` | `gpt-5` | `gpt-5.2` | `gpt-5.2-chat-latest` | `gpt-5.2-pro`> | null;
	ai_anthropic_allowed_models?: Array<`claude-haiku-4-5` | `claude-sonnet-4-5` | `claude-opus-4-5`> | null;
	ai_google_allowed_models?: Array<`gemini-3-pro-preview` | `gemini-3-flash-preview` | `gemini-2.5-pro` | `gemini-2.5-flash`> | null;
	collaborative_editing_enabled?: boolean;
	/** @description Settings for the Command Palette Module. */
	command_palette_settings?: Record<string, any> | null;
	TTA_KEY?: string | null;
	TTA_KEY_VIRUS?: string | null;
	TTA_VIRUSSCANNER_MODE?: string | null;
	TTA_VIRUSSCANNER_FLOW_ID?: string | null;
	TTA_VIRUSSCANNER_ENABLED?: boolean | null;
}

export interface DirectusUser {
	/** @primaryKey */
	id: string;
	first_name?: string | null;
	last_name?: string | null;
	email?: string | null;
	password?: string | null;
	location?: string | null;
	title?: string | null;
	description?: string | null;
	tags?: string[] | null;
	avatar?: DirectusFile | string | null;
	language?: string | null;
	tfa_secret?: string | null;
	status?: 'draft' | 'invited' | 'unverified' | 'active' | 'suspended' | 'archived';
	role?: DirectusRole | string | null;
	token?: string | null;
	last_access?: string | null;
	last_page?: string | null;
	provider?: 'apoa';
	external_identifier?: string | null;
	auth_data?: 'json' | null;
	email_notifications?: boolean | null;
	appearance?: null | 'auto' | 'light' | 'dark' | null;
	theme_dark?: string | null;
	theme_light?: string | null;
	theme_light_overrides?: 'json' | null;
	theme_dark_overrides?: 'json' | null;
	text_direction?: 'auto' | 'ltr' | 'rtl';
	has_subscription?: boolean | null;
	person?: Person | string | null;
	membership_number?: string | null;
	country?: 'json' | null;
	voucher_codes?: CongressVoucherCode[] | string[];
	organisations?: OrganisationsUser[] | string[];
	user_policy_agreements?: UserPolicyAgreement[] | string[];
	/** @description Blog posts this user has authored. */
	posts?: Post[] | string[];
	policies?: DirectusAccess[] | string[];
}

export interface DirectusDashboard {
	/** @primaryKey */
	id: string;
	name?: string;
	icon?: string;
	note?: string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	color?: string | null;
	panels?: DirectusPanel[] | string[];
}

export interface DirectusPanel {
	/** @primaryKey */
	id: string;
	dashboard?: DirectusDashboard | string;
	name?: string | null;
	icon?: string | null;
	color?: string | null;
	show_header?: boolean;
	note?: string | null;
	type?: string;
	position_x?: number;
	position_y?: number;
	width?: number;
	height?: number;
	options?: 'json' | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
}

export interface DirectusNotification {
	/** @primaryKey */
	id: number;
	timestamp?: string | null;
	status?: string | null;
	recipient?: DirectusUser | string;
	sender?: DirectusUser | string | null;
	subject?: string;
	message?: string | null;
	collection?: string | null;
	item?: string | null;
}

export interface DirectusShare {
	/** @primaryKey */
	id: string;
	name?: string | null;
	collection?: DirectusCollection | string;
	item?: string;
	role?: DirectusRole | string | null;
	password?: string | null;
	user_created?: DirectusUser | string | null;
	date_created?: string | null;
	date_start?: string | null;
	date_end?: string | null;
	times_used?: number | null;
	max_uses?: number | null;
}

export interface DirectusFlow {
	/** @primaryKey */
	id: string;
	name?: string;
	icon?: string | null;
	color?: string | null;
	description?: string | null;
	status?: string;
	trigger?: string | null;
	accountability?: string | null;
	options?: 'json' | null;
	operation?: DirectusOperation | string | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	operations?: DirectusOperation[] | string[];
}

export interface DirectusOperation {
	/** @primaryKey */
	id: string;
	name?: string | null;
	key?: string;
	type?: string;
	position_x?: number;
	position_y?: number;
	options?: 'json' | null;
	resolve?: DirectusOperation | string | null;
	reject?: DirectusOperation | string | null;
	flow?: DirectusFlow | string;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
}

export interface DirectusTranslation {
	/** @primaryKey */
	id: string;
	/** @required */
	language: string;
	/** @required */
	key: string;
	/** @required */
	value: string;
}

export interface DirectusVersion {
	/** @primaryKey */
	id: string;
	key?: string;
	name?: string | null;
	collection?: DirectusCollection | string;
	item?: string;
	hash?: string | null;
	date_created?: string | null;
	date_updated?: string | null;
	user_created?: DirectusUser | string | null;
	user_updated?: DirectusUser | string | null;
	delta?: 'json' | null;
}

export interface DirectusExtension {
	enabled?: boolean;
	/** @primaryKey */
	id: string;
	folder?: string;
	source?: string;
	bundle?: string | null;
}

export interface DirectusDeployment {
	/** @primaryKey */
	id: string;
	provider?: string;
	credentials?: string | null;
	options?: 'json' | null;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	webhook_ids?: 'json' | null;
	webhook_secret?: string | null;
	last_synced_at?: string | null;
	projects?: DirectusDeploymentProject[] | string[];
}

export interface DirectusDeploymentProject {
	/** @primaryKey */
	id: string;
	deployment?: DirectusDeployment | string;
	external_id?: string;
	name?: string;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	url?: string | null;
	framework?: string | null;
	deployable?: boolean;
	runs?: DirectusDeploymentRun[] | string[];
}

export interface DirectusDeploymentRun {
	/** @primaryKey */
	id: string;
	project?: DirectusDeploymentProject | string;
	external_id?: string;
	target?: string;
	date_created?: string | null;
	user_created?: DirectusUser | string | null;
	status?: string | null;
	url?: string | null;
	started_at?: string | null;
	completed_at?: string | null;
}

export interface Schema {
	abstract_criteria: AbstractCriteria[];
	abstract_grading_system: AbstractGradingSystem[];
	abstract_reviewers: AbstractReviewer[];
	abstract_reviews: AbstractReview[];
	abstract_review_scores: AbstractReviewScore[];
	abstracts: Abstract[];
	abstract_scoring: AbstractScoring[];
	abstract_submission_figures: AbstractSubmissionFigure[];
	abstract_submissions: AbstractSubmission[];
	abstract_submission_values: AbstractSubmissionValue[];
	admin_document_approvals: AdminDocumentApproval[];
	admin_document_events: AdminDocumentEvent[];
	admin_documents: AdminDocument[];
	ai_prompts: AiPrompt[];
	apoa_sections: ApoaSection[];
	apoa_sections_committees: ApoaSectionsCommittee[];
	assignments: Assignment[];
	block_accordion: BlockAccordion[];
	block_accordion_items: BlockAccordionItem[];
	block_button: BlockButton[];
	block_button_group: BlockButtonGroup[];
	block_chargetable: BlockChargetable[];
	block_chargetable_columns: BlockChargetableColumn[];
	block_chargetable_columns_charges: BlockChargetableColumnsCharge[];
	block_chargetable_tabs: BlockChargetableTab[];
	block_form: BlockForm[];
	block_form_flow: BlockFormFlow[];
	block_gallery: BlockGallery[];
	block_gallery_items: BlockGalleryItem[];
	block_hero: BlockHero[];
	block_mainhero: BlockMainhero[];
	block_mainhero_announcements: BlockMainheroAnnouncement[];
	block_mainhero_partners: BlockMainheroPartner[];
	block_messages: BlockMessage[];
	block_messages_message: BlockMessagesMessage[];
	block_messages_message_persons: BlockMessagesMessagePerson[];
	block_people: BlockPeople[];
	block_people_people: BlockPeoplePeople[];
	block_posts: BlockPost[];
	block_pricing: BlockPricing[];
	block_pricing_cards: BlockPricingCard[];
	block_pricing_cards_congress_charges: BlockPricingCardsCongressCharge[];
	block_pricing_tabs: BlockPricingTab[];
	block_richtext: BlockRichtext[];
	block_richtext_translations: BlockRichtextTranslation[];
	block_sponsors: BlockSponsor[];
	block_sponsors_sponsors: BlockSponsorsSponsor[];
	case_message_files: CaseMessageFile[];
	case_messages: CaseMessage[];
	committee: Committee[];
	committee_positions: CommitteePosition[];
	congress: Congress[];
	congress_access_tokens: CongressAccessToken[];
	congress_badge_types: CongressBadgeType[];
	congress_break_room: CongressBreakRoom[];
	congress_breaks: CongressBreak[];
	congress_charges: CongressCharge[];
	congress_days: CongressDay[];
	congress_day_slots: CongressDaySlot[];
	congress_events: CongressEvent[];
	congress_hotels: CongressHotel[];
	congress_issued_tickets: CongressIssuedTicket[];
	congress_key_dates: CongressKeyDate[];
	congress_order_access_tokens: CongressOrderAccessToken[];
	congress_order_owners: CongressOrderOwner[];
	congress_orders: CongressOrder[];
	congress_order_sessions: CongressOrderSession[];
	congress_orders_evidence: CongressOrdersEvidence[];
	congress_orders_files: CongressOrdersFile[];
	congress_organisations: CongressOrganisation[];
	congress_pricing_periods: CongressPricingPeriod[];
	congress_privilege_persons: CongressPrivilegePerson[];
	congress_privileges: CongressPrivilege[];
	congress_registration_groups: CongressRegistrationGroup[];
	congress_registrations: CongressRegistration[];
	congress_schedules: CongressSchedule[];
	congress_sessions: CongressSession[];
	congress_sessions_organisations: CongressSessionsOrganisation[];
	congress_sessions_venue_rooms: CongressSessionsVenueRoom[];
	congress_sponsors: CongressSponsor[];
	congress_sponsor_tiers: CongressSponsorTier[];
	congress_tickets: CongressTicket[];
	congress_voucher_code_redemptions: CongressVoucherCodeRedemption[];
	congress_voucher_codes: CongressVoucherCode[];
	congress_vouchers: CongressVoucher[];
	countries: Country[];
	country_travel_info: CountryTravelInfo[];
	decision_request_definitions: DecisionRequestDefinition[];
	decision_requests: DecisionRequest[];
	email_campaigns: EmailCampaign[];
	email_campaign_sends: EmailCampaignSend[];
	email_templates: EmailTemplate[];
	form_fields: FormField[];
	form_flow_fields: FormFlowField[];
	form_flows: FormFlow[];
	form_flow_step_conditions: FormFlowStepCondition[];
	form_flow_step_rules: FormFlowStepRule[];
	form_flow_steps: FormFlowStep[];
	form_flow_submissions: FormFlowSubmission[];
	form_flow_submission_values: FormFlowSubmissionValue[];
	forms: Form[];
	form_submissions: FormSubmission[];
	form_submission_values: FormSubmissionValue[];
	globals: Globals;
	hotels: Hotel[];
	issue_comments: IssueComment[];
	issues: Issue[];
	languages: Language[];
	navigation: Navigation[];
	navigation_items: NavigationItem[];
	navigation_items_translations: NavigationItemsTranslation[];
	organisation_persons: OrganisationPerson[];
	organisations: Organisation[];
	organisations_users: OrganisationsUser[];
	page_blocks: PageBlock[];
	pages: Page[];
	people_list: PeopleList[];
	people_list_assignments: PeopleListAssignment[];
	people_list_congress_events: PeopleListCongressEvent[];
	people_list_entry: PeopleListEntry[];
	people_list_persons: PeopleListPerson[];
	persons: Person[];
	persons_committee_positions: PersonsCommitteePosition[];
	policies: Policy[];
	posts: Post[];
	privileges: Privilege[];
	redirects: Redirect[];
	registration_imports: RegistrationImport[];
	roles: Role[];
	schedule_changes: ScheduleChange[];
	schedule_changes_type: ScheduleChangesType[];
	scientific_tags: ScientificTag[];
	site_branding: SiteBranding[];
	site_branding_asset_files: SiteBrandingAssetFile[];
	site_branding_assets: SiteBrandingAsset[];
	sites: Site[];
	sites_policies: SitesPolicy[];
	sponsors: Sponsor[];
	support_cases: SupportCase[];
	ticket_tailor_bundles: TicketTailorBundle[];
	ticket_tailor_issued_tickets: TicketTailorIssuedTicket[];
	ticket_tailor_orders: TicketTailorOrder[];
	TTA_htmltemplates: TTAHtmltemplate[];
	user_policy_agreements: UserPolicyAgreement[];
	venue_rooms: VenueRoom[];
	venues: Venue[];
	venue_visa_info: VenueVisaInfo[];
	venue_visa_info_countries: VenueVisaInfoCountry[];
	directus_access: DirectusAccess[];
	directus_activity: DirectusActivity[];
	directus_collections: DirectusCollection[];
	directus_comments: DirectusComment[];
	directus_fields: DirectusField[];
	directus_files: DirectusFile[];
	directus_folders: DirectusFolder[];
	directus_migrations: DirectusMigration[];
	directus_permissions: DirectusPermission[];
	directus_policies: DirectusPolicy[];
	directus_presets: DirectusPreset[];
	directus_relations: DirectusRelation[];
	directus_revisions: DirectusRevision[];
	directus_roles: DirectusRole[];
	directus_sessions: DirectusSession[];
	directus_settings: DirectusSettings;
	directus_users: DirectusUser[];
	directus_dashboards: DirectusDashboard[];
	directus_panels: DirectusPanel[];
	directus_notifications: DirectusNotification[];
	directus_shares: DirectusShare[];
	directus_flows: DirectusFlow[];
	directus_operations: DirectusOperation[];
	directus_translations: DirectusTranslation[];
	directus_versions: DirectusVersion[];
	directus_extensions: DirectusExtension[];
	directus_deployments: DirectusDeployment[];
	directus_deployment_projects: DirectusDeploymentProject[];
	directus_deployment_runs: DirectusDeploymentRun[];
}

export enum CollectionNames {
	abstract_criteria = 'abstract_criteria',
	abstract_grading_system = 'abstract_grading_system',
	abstract_reviewers = 'abstract_reviewers',
	abstract_reviews = 'abstract_reviews',
	abstract_review_scores = 'abstract_review_scores',
	abstracts = 'abstracts',
	abstract_scoring = 'abstract_scoring',
	abstract_submission_figures = 'abstract_submission_figures',
	abstract_submissions = 'abstract_submissions',
	abstract_submission_values = 'abstract_submission_values',
	admin_document_approvals = 'admin_document_approvals',
	admin_document_events = 'admin_document_events',
	admin_documents = 'admin_documents',
	ai_prompts = 'ai_prompts',
	apoa_sections = 'apoa_sections',
	apoa_sections_committees = 'apoa_sections_committees',
	assignments = 'assignments',
	block_accordion = 'block_accordion',
	block_accordion_items = 'block_accordion_items',
	block_button = 'block_button',
	block_button_group = 'block_button_group',
	block_chargetable = 'block_chargetable',
	block_chargetable_columns = 'block_chargetable_columns',
	block_chargetable_columns_charges = 'block_chargetable_columns_charges',
	block_chargetable_tabs = 'block_chargetable_tabs',
	block_form = 'block_form',
	block_form_flow = 'block_form_flow',
	block_gallery = 'block_gallery',
	block_gallery_items = 'block_gallery_items',
	block_hero = 'block_hero',
	block_mainhero = 'block_mainhero',
	block_mainhero_announcements = 'block_mainhero_announcements',
	block_mainhero_partners = 'block_mainhero_partners',
	block_messages = 'block_messages',
	block_messages_message = 'block_messages_message',
	block_messages_message_persons = 'block_messages_message_persons',
	block_people = 'block_people',
	block_people_people = 'block_people_people',
	block_posts = 'block_posts',
	block_pricing = 'block_pricing',
	block_pricing_cards = 'block_pricing_cards',
	block_pricing_cards_congress_charges = 'block_pricing_cards_congress_charges',
	block_pricing_tabs = 'block_pricing_tabs',
	block_richtext = 'block_richtext',
	block_richtext_translations = 'block_richtext_translations',
	block_sponsors = 'block_sponsors',
	block_sponsors_sponsors = 'block_sponsors_sponsors',
	case_message_files = 'case_message_files',
	case_messages = 'case_messages',
	committee = 'committee',
	committee_positions = 'committee_positions',
	congress = 'congress',
	congress_access_tokens = 'congress_access_tokens',
	congress_badge_types = 'congress_badge_types',
	congress_break_room = 'congress_break_room',
	congress_breaks = 'congress_breaks',
	congress_charges = 'congress_charges',
	congress_days = 'congress_days',
	congress_day_slots = 'congress_day_slots',
	congress_events = 'congress_events',
	congress_hotels = 'congress_hotels',
	congress_issued_tickets = 'congress_issued_tickets',
	congress_key_dates = 'congress_key_dates',
	congress_order_access_tokens = 'congress_order_access_tokens',
	congress_order_owners = 'congress_order_owners',
	congress_orders = 'congress_orders',
	congress_order_sessions = 'congress_order_sessions',
	congress_orders_evidence = 'congress_orders_evidence',
	congress_orders_files = 'congress_orders_files',
	congress_organisations = 'congress_organisations',
	congress_pricing_periods = 'congress_pricing_periods',
	congress_privilege_persons = 'congress_privilege_persons',
	congress_privileges = 'congress_privileges',
	congress_registration_groups = 'congress_registration_groups',
	congress_registrations = 'congress_registrations',
	congress_schedules = 'congress_schedules',
	congress_sessions = 'congress_sessions',
	congress_sessions_organisations = 'congress_sessions_organisations',
	congress_sessions_venue_rooms = 'congress_sessions_venue_rooms',
	congress_sponsors = 'congress_sponsors',
	congress_sponsor_tiers = 'congress_sponsor_tiers',
	congress_tickets = 'congress_tickets',
	congress_voucher_code_redemptions = 'congress_voucher_code_redemptions',
	congress_voucher_codes = 'congress_voucher_codes',
	congress_vouchers = 'congress_vouchers',
	countries = 'countries',
	country_travel_info = 'country_travel_info',
	decision_request_definitions = 'decision_request_definitions',
	decision_requests = 'decision_requests',
	email_campaigns = 'email_campaigns',
	email_campaign_sends = 'email_campaign_sends',
	email_templates = 'email_templates',
	form_fields = 'form_fields',
	form_flow_fields = 'form_flow_fields',
	form_flows = 'form_flows',
	form_flow_step_conditions = 'form_flow_step_conditions',
	form_flow_step_rules = 'form_flow_step_rules',
	form_flow_steps = 'form_flow_steps',
	form_flow_submissions = 'form_flow_submissions',
	form_flow_submission_values = 'form_flow_submission_values',
	forms = 'forms',
	form_submissions = 'form_submissions',
	form_submission_values = 'form_submission_values',
	globals = 'globals',
	hotels = 'hotels',
	issue_comments = 'issue_comments',
	issues = 'issues',
	languages = 'languages',
	navigation = 'navigation',
	navigation_items = 'navigation_items',
	navigation_items_translations = 'navigation_items_translations',
	organisation_persons = 'organisation_persons',
	organisations = 'organisations',
	organisations_users = 'organisations_users',
	page_blocks = 'page_blocks',
	pages = 'pages',
	people_list = 'people_list',
	people_list_assignments = 'people_list_assignments',
	people_list_congress_events = 'people_list_congress_events',
	people_list_entry = 'people_list_entry',
	people_list_persons = 'people_list_persons',
	persons = 'persons',
	persons_committee_positions = 'persons_committee_positions',
	policies = 'policies',
	posts = 'posts',
	privileges = 'privileges',
	redirects = 'redirects',
	registration_imports = 'registration_imports',
	roles = 'roles',
	schedule_changes = 'schedule_changes',
	schedule_changes_type = 'schedule_changes_type',
	scientific_tags = 'scientific_tags',
	site_branding = 'site_branding',
	site_branding_asset_files = 'site_branding_asset_files',
	site_branding_assets = 'site_branding_assets',
	sites = 'sites',
	sites_policies = 'sites_policies',
	sponsors = 'sponsors',
	support_cases = 'support_cases',
	ticket_tailor_bundles = 'ticket_tailor_bundles',
	ticket_tailor_issued_tickets = 'ticket_tailor_issued_tickets',
	ticket_tailor_orders = 'ticket_tailor_orders',
	TTA_htmltemplates = 'TTA_htmltemplates',
	user_policy_agreements = 'user_policy_agreements',
	venue_rooms = 'venue_rooms',
	venues = 'venues',
	venue_visa_info = 'venue_visa_info',
	venue_visa_info_countries = 'venue_visa_info_countries',
	directus_access = 'directus_access',
	directus_activity = 'directus_activity',
	directus_collections = 'directus_collections',
	directus_comments = 'directus_comments',
	directus_fields = 'directus_fields',
	directus_files = 'directus_files',
	directus_folders = 'directus_folders',
	directus_migrations = 'directus_migrations',
	directus_permissions = 'directus_permissions',
	directus_policies = 'directus_policies',
	directus_presets = 'directus_presets',
	directus_relations = 'directus_relations',
	directus_revisions = 'directus_revisions',
	directus_roles = 'directus_roles',
	directus_sessions = 'directus_sessions',
	directus_settings = 'directus_settings',
	directus_users = 'directus_users',
	directus_dashboards = 'directus_dashboards',
	directus_panels = 'directus_panels',
	directus_notifications = 'directus_notifications',
	directus_shares = 'directus_shares',
	directus_flows = 'directus_flows',
	directus_operations = 'directus_operations',
	directus_translations = 'directus_translations',
	directus_versions = 'directus_versions',
	directus_extensions = 'directus_extensions',
	directus_deployments = 'directus_deployments',
	directus_deployment_projects = 'directus_deployment_projects',
	directus_deployment_runs = 'directus_deployment_runs'
}