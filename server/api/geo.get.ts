export default defineEventHandler((event) => {
	return { country: getRequestCountry(event) }
})
