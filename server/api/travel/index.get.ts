import type { VenueVisaInfo, CountryTravelInfo } from '#shared/types/schema';

export default defineEventHandler(
	async (event) => {
		const { venueId } = getQuery(event);

		if (!venueId) {
			return { visaInfo: [], travelInfo: [] };
		}

		try {
			// Fetch both collections as nested O2M relations on the venue in one request
			const venue = await directusServer.request(
				readItem('venues', venueId as string, {
					fields: [
						'id',
						'airport_codes',
						'travel_general_info',
						'visa_general_info',

						{
							visa_info_by_country: ['id', 'details', 'link', { countries: ['id', 'country'] }, 'date_updated', 'date_created'],
							travel_info_by_country: ['id', 'details', 'link', 'country', 'date_updated', 'date_created'],
						},
					] as any,
					deep: {
						travel_info_by_country: {
							_limit: -1
						}
					}
				}),
			);

			const v = venue as any;
			return {
				destinationAirport: (v?.airport_codes[0] ?? null) as string | null,
				travelGeneralInfo: (v?.travel_general_info ?? null) as string | null,
				visaInfo: (v?.visa_info_by_country ?? []) as VenueVisaInfo[],
				travelInfo: (v?.travel_info_by_country ?? []) as CountryTravelInfo[],
			};
		} catch (e) {
			throw createError({ statusCode: 500, statusMessage: 'Failed to fetch travel information' });
		}
	},
);
