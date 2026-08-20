import type { H3Event } from 'h3'

/**
 * Best-effort country code from whichever hosting platform's edge injects a
 * geo header — no external geo-IP lookup. Returns 'XX' when none is present
 * (e.g. local dev, or a host that doesn't inject one of these).
 */
export function getRequestCountry(event: H3Event): string {
	const headers = getHeaders(event)

	return (
		headers['cf-ipcountry'] ?? // Cloudflare
		headers['x-vercel-ip-country'] ?? // Vercel
		headers['x-country'] ?? // Netlify
		'XX'
	).toUpperCase()
}
