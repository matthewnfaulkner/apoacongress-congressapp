import type { CongressCharge, Hotel, AccommodationChargeDetail } from '#shared/types/schema'

export interface TicketEnrichment {
	richDescription: string | null;
	shortDescription: string | null;
	detailsPermalink: string | null;
	tagline: string | null;
	hotel: { id: string; name: string; starRating: number | null; image: string | null; tagline: string | null } | null;
	roomSize: string | null;
	stayLength: string | null;
	checkIn: string | null;
	checkOut: string | null;
	membersOnly: boolean;
}

interface CongressTicketRow {
	id: string;
	charge:
		| (Pick<
				CongressCharge,
				'id' | 'description' | 'category' | 'sub_category' | 'details' | 'members_only' | 'tagline' | 'short_description'
		  > & {
				hotel:
					| (Pick<Hotel, 'id' | 'name' | 'star_rating' | 'image'> & { congresses: Array<{ tagline: string | null }> })
					| null;
				details_page: { permalink: string | null } | null;
		  })
		| null;
}

function isAccommodationDetail(detail: unknown): detail is AccommodationChargeDetail {
	return !!detail && typeof detail === 'object' && 'check_in' in detail;
}

/**
 * Looks up the `congress_tickets` rows (populated separately via a Directus
 * Flow, keyed by Ticket Tailor ticket_type id) for the given ticket type ids,
 * and resolves each one's linked congress_charge (+ hotel) into a flat
 * enrichment map. `congress_tickets` isn't in the generated schema yet — see
 * the cast below — and rows without a linked charge are simply omitted, since
 * unlinked tickets should render unenriched rather than break the fetch.
 */
export async function fetchTicketEnrichment(ticketTypeIds: string[]): Promise<Map<string, TicketEnrichment>> {
	const enrichmentById = new Map<string, TicketEnrichment>();

	if (ticketTypeIds.length === 0) return enrichmentById;

	let rows: CongressTicketRow[] = [];

	try {
		const config = useRuntimeConfig();

		rows = (await directusServer.request(
			withToken(
				config.directusOrderBotToken as string,
				readItems('congress_tickets' as any, {
					filter: { id: { _in: ticketTypeIds } },
					fields: [
						'id',
						{
							charge: [
								'id', 'description', 'category', 'sub_category', 'details', 'members_only', 'tagline', 'short_description',
								{ hotel: ['id', 'name', 'star_rating', 'image', { congresses: ['tagline'] }] },
								{ details_page: ['permalink'] },
							],
						},
					],
					limit: -1,
				} as any),
			),
		)) as CongressTicketRow[];
	} catch (error) {
		// Was silently swallowed before — logged now since a failure here (e.g.
		// missing field permissions on a newly-added congress_charges field)
		// looks identical to "no enrichment data" otherwise, silently
		// defaulting requiresMembership/hotel/etc to false/null for every
		// ticket type rather than surfacing the actual problem.
		console.error('[fetchTicketEnrichment] Failed to fetch congress_tickets enrichment:', error);
		return enrichmentById;
	}

	for (const row of rows) {
		const charge = row.charge;
		if (!charge) continue;

		const hotel = charge.hotel
			? {
					id: charge.hotel.id,
					name: charge.hotel.name,
					starRating: charge.hotel.star_rating ?? null,
					image: getDirectusAssetURL(charge.hotel.image ?? null) || null,
					tagline: charge.hotel.congresses?.[0]?.tagline ?? null,
				}
			: null;

		const detail = Array.isArray(charge.details) ? charge.details[0] : null;
		const stayDetail = isAccommodationDetail(detail) ? detail : null;

		enrichmentById.set(row.id, {
			richDescription: charge.description ?? null,
			shortDescription: charge.short_description ?? null,
			detailsPermalink: charge.details_page?.permalink ?? null,
			tagline: charge.tagline ?? null,
			hotel,
			roomSize: charge.sub_category ?? null,
			stayLength: stayDetail?.stay_length ?? null,
			checkIn: stayDetail?.check_in ?? null,
			checkOut: stayDetail?.check_out ?? null,
			membersOnly: charge.members_only ?? false,
		});
	}

	return enrichmentById;
}
