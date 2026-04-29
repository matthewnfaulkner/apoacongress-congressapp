export default defineEventHandler((event) => {
	const headers = getHeaders(event)

	const country =
		headers['cf-ipcountry'] ?? // Cloudflare
		headers['x-vercel-ip-country'] ?? // Vercel
		headers['x-country'] ?? // Netlify
		'XX'

	return { country }
})
