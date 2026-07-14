export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	const refreshToken = parseCookies(event)[config.refreshTokenName];

	if (refreshToken) {
		try {
			// Ask Directus to revoke this refresh token server-side — just
			// clearing our own cookie copy isn't enough, since the raw token
			// would still be valid if replayed directly against Directus.
			await $fetch(`${config.public.directusUrl}/auth/logout`, {
				method: 'POST',
				body: { refresh_token: refreshToken, mode: 'json' },
			});
		} catch {
			// token may already be expired/revoked — still clear our own cookie
		}
	}

	// HttpOnly, so only a Set-Cookie response (this) can clear it — client-side
	// JS and the SDK's own directus.logout() call (no credentials in json mode)
	// never could. Left uncleared, login.vue / callback.get.ts fall back to it
	// and silently mint a fresh session after "logout".
	deleteCookie(event, config.refreshTokenName, { path: '/' });
	deleteCookie(event, config.sessionTokenName, { path: '/' });

	return { success: true };
});
