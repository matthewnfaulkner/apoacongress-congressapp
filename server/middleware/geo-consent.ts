// Countries where cookie consent banners are legally required.
// Covers GDPR (EU/EEA), UK, and other strong privacy law jurisdictions.
const CONSENT_REQUIRED_COUNTRIES = new Set([
	// EU member states
	'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
	'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
	'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
	// EEA
	'IS', 'LI', 'NO',
	// UK (retained GDPR)
	'GB',
	// Other strong privacy laws
	'CH', // Switzerland nFADP
	'BR', // Brazil LGPD
	'CA', // Canada PIPEDA / Quebec Law 25,
	'XX'
])

export default defineEventHandler((event) => {
	// Only run on page requests, not API calls
	const url = getRequestURL(event)
	if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_')) return

	const headers = getHeaders(event)

	const country = (
		headers['cf-ipcountry'] ??
		headers['x-vercel-ip-country'] ??
		headers['x-country'] ??
		'XX'
	).toUpperCase()

	// If consent is required for this region, do nothing — let the banner show normally
	if (CONSENT_REQUIRED_COUNTRIES.has(country)) return

	// If consent cookie is already set, don't overwrite it
	const existingConsent = getCookie(event, 'ncc_c')
	if (existingConsent !== undefined) return

	// Pre-accept all cookies for regions that don't require a banner.
	// ncc_c = all cookie IDs concatenated (how nuxt-cookie-control tracks "all accepted")
	// ncc_e = enabled cookie IDs joined by "~"
	const config = useRuntimeConfig();
	const allIds = config.sessionTokenName + 'pa';
	const enabledIds = config.sessionTokenName + '~pa';

	const cookieOptions = {
		path: '/',
		maxAge: 60 * 60 * 24 * 365, // 1 year
		sameSite: 'lax' as const,
	}

	setCookie(event, 'ncc_c', allIds, cookieOptions)
	setCookie(event, 'ncc_e', enabledIds, cookieOptions)
})
