import airportsByCountry from '../../../public/api/airports.json';

export default defineEventHandler((event) => {
	const { iata_country_code } = getQuery(event);

	if (!iata_country_code) {
		throw createError({ statusCode: 400, statusMessage: 'iata_country_code is required' });
	}

	const code = (iata_country_code as string).toUpperCase();
	const airports: { airportcode: string; airport: string; city: string; country: string }[] =
		(airportsByCountry as Record<string, { airportcode: string; airport: string; city: string; country: string }[]>)[code] ?? [];

	return { data: airports };
});
