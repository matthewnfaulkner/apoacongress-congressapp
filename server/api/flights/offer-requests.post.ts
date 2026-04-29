interface OfferRequestBody {
	origins: string[];          // IATA codes — one slice per origin
	destination: string;        // IATA code of the congress venue
	departure_date: string;     // outbound date e.g. "2027-04-20"
	return_date: string;        // return date e.g. "2027-04-27"
	return_offers?: boolean;    // include offers in the response (default: false)
}

export default defineEventHandler(async (event) => {
	const body = await readBody<OfferRequestBody>(event);

	const { origins, destination, departure_date, return_date, return_offers = false } = body ?? {};

	if (!origins?.length || !destination || !departure_date || !return_date) {
		throw createError({
			statusCode: 400,
			statusMessage: 'origins (array), destination, departure_date, and return_date are required',
		});
	}

	const { duffelApiKey } = useRuntimeConfig();

	if (!duffelApiKey) {
		throw createError({ statusCode: 500, statusMessage: 'Duffel API key not configured' });
	}

	// Outbound: one slice per origin → destination
	const outboundSlices = origins.map((origin) => ({
		origin,
		destination,
		departure_date,
	}));

	// Return: one slice per origin — destination → origin
	const returnSlices = origins.map((origin) => ({
		origin: destination,
		destination: origin,
		departure_date: return_date,
	}));

	const slices = [...outboundSlices, ...returnSlices];

	const response = await $fetch('https://api.duffel.com/air/offer_requests', {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Accept-Encoding': 'gzip',
			'Content-Type': 'application/json',
			'Duffel-Version': 'v2',
			'Authorization': `Bearer ${duffelApiKey}`,
		},
		query: {
			return_offers,
			supplier_timeout: 10000,
		},
		body: {
			data: {
				slices,
				passengers: [{ type: 'adult' }],
				max_connections: 2,
				cabin_class: 'economy',
			},
		},
	});

	return response;
});
