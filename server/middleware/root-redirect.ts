export default defineEventHandler(async (event) => {
	try {
		const config = useRuntimeConfig()

		if (
			event.path.startsWith('/api') ||
			event.path.startsWith('/_nuxt') ||
			event.path.startsWith('/_ipx') ||
			event.path === '/favicon.ico' ||
			event.path.startsWith('/public') ||
			event.path.startsWith('/admin_login') ||
			event.path.startsWith('/login') ||
			event.path.startsWith('/no-access') ||
            event.path.startsWith('/logout') ||
			event.path.startsWith('/maintenance') ||
			event.path.startsWith('/preview')
		) {
			return
		}

		const sessionToken = getCookie(event, config.sessionTokenName)

		if (config.public.isSandbox) {
			if (!sessionToken) {
				return sendRedirect(event, '/admin_login', 302)
			}

			let userPolicies: string[] = []
			try {
				const me = await directusServer.request(withToken(sessionToken, readMe({
					fields: [
						'id',
						{ policies: [{ policy: ['name'] }] },
						{ role: [{ policies: [{ policy: ['name'] }] }] }
					]
				})))

				userPolicies = [
					...((me as any).policies?.map((p: any) => p.policy?.name).filter(Boolean) ?? []),
					...((me as any).role?.policies?.map((p: any) => p.policy?.name).filter(Boolean) ?? []),
				]
			} catch {
				return sendRedirect(event, '/admin_login', 302)
			}

			if (!userPolicies.includes('Sandbox - Access')) {
				return sendRedirect(event, '/no-access', 302)
			}

			// Sandbox access confirmed — check maintenance/preview bypass
			let site: { preview?: boolean, maintenance_mode?: boolean } | null = null
			try {
				site = await directusServer.request(
					readItem('sites', config.public.siteId, { fields: ['preview', 'maintenance_mode'] })
				)
			} catch {
				// Directus unreachable — skip preview-redirect logic and let the page load,
				// where the layout's own site-data fetch will surface the outage properly.
				return
			}
			// Maintenance takes precedence over preview
			if (site?.maintenance_mode && !userPolicies.includes('Admin - Bypass Maintenance')) {
				return sendRedirect(event, '/maintenance', 302)
			}
			if (!site?.preview || event.path === '/preview') return
			if (userPolicies.includes('Admin - Bypass Preview')) return
			return sendRedirect(event, '/preview', 302)
		}

		// Non-sandbox: existing preview redirect logic
		let site: { preview?: boolean, maintenance_mode?: boolean } | null = null
		try {
			site = await directusServer.request(
				readItem('sites', config.public.siteId, { fields: ['preview', 'maintenance_mode'] })
			)
		} catch {
			// Directus unreachable — skip preview-redirect logic and let the page load,
			// where the layout's own site-data fetch will surface the outage properly.
			return
		}

		// Maintenance takes precedence over preview
		if (site?.maintenance_mode) {
			if (sessionToken) {
				try {
					const me = await directusServer.request(withToken(sessionToken, readMe({
						fields: [
							'id',
							{ policies: [{ policy: ['name'] }] },
							{ role: [{ policies: [{ policy: ['name'] }] }] }
						],
						filter: {
							_or: [
								{ policies: { policy: { name: { _eq: 'Admin - Bypass Maintenance' } } } },
								{ role: { policies: { policy: { name: { _eq: 'Admin - Bypass Maintenance' } } } } }
							]
						}
					})))
					if (!me.policies) return sendRedirect(event, '/maintenance', 302)
				} catch (error) {
					console.log(error)
					return sendRedirect(event, '/maintenance', 302)
				}
			} else {
				return sendRedirect(event, '/maintenance', 302)
			}
		}

		if (!site?.preview || event.path === '/preview') return

		if (sessionToken) {
			try {
				const me = await directusServer.request(withToken(sessionToken, readMe({
					fields: [
						'id',
						{ policies: [{ policy: ['name'] }] },
						{ role: [{ policies: [{ policy: ['name'] }] }] }
					],
					filter: {
						_or: [
							{ policies: { policy: { name: { _eq: 'Admin - Bypass Preview' } } } },
							{ role: { policies: { policy: { name: { _eq: 'Admin - Bypass Preview' } } } } }
						]
					}
				})))
				if (me.policies) return
			} catch (error) {
				console.log(error)
			}
		}

		return sendRedirect(event, '/preview', 302)
	} catch (error) {
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
	}
})
