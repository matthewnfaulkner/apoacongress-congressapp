import type { GeoJSONPoint, VenueVisaInfo, CountryTravelInfo } from '#shared/types/schema';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const { venueId } = getQuery(event);

	if (!venueId) {
		return { visaInfo: [], travelInfo: [] };
	}

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const travelParams = {
		fields: [
			'id',
			'airport_codes',
			'travel_general_info',
			'visa_general_info',
			'location',
			{
				visa_info_by_country: ['id', 'details', 'link', { countries: ['id', 'country'] }, 'date_updated', 'date_created'],
				travel_info_by_country: ['id', 'details', 'link', 'country', 'date_updated', 'date_created'],
			},
		] as any,
		deep: { travel_info_by_country: { _limit: -1 } },
	};

	try {
		const venue = await directusServer.request(
			sessionToken
				? withToken(sessionToken, readItem('venues', venueId as string, travelParams))
				: readItem('venues', venueId as string, travelParams),
		);

		const v = venue as any;
		return {
			destinationAirport: (v?.airport_codes[0] ?? null) as string | null,
			travelGeneralInfo: (v?.travel_general_info ?? null) as string | null,
			visaInfo: (v?.visa_info_by_country ?? []) as VenueVisaInfo[],
			travelInfo: (v?.travel_info_by_country ?? []) as CountryTravelInfo[],
			venueLocation: (v?.location ?? null) as GeoJSONPoint | null,
		};
	} catch (e) {
		throw createError({ statusCode: 500, statusMessage: 'Failed to fetch travel information' });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `travel-${getQuery(event).venueId}`,
	});
