export default defineEventHandler(async (event) => {
	try {
        const config = useRuntimeConfig()

        // Skip API routes, Nitro assets, favicon, etc.
        if (
        event.path.startsWith('/api') ||
        event.path.startsWith('/_nuxt') ||
        event.path.startsWith('/_ipx') ||
        event.path === '/favicon.ico' ||
        event.path.startsWith('/public') ||
        event.path.startsWith('/admin_login') ||
        event.path.startsWith('/login')
        ) {
        return
        }
        
        const sessionToken = getCookie(event, config.sessionTokenName)

        // Fetch backend settings for redirect
        const site = await directusServer.request(
            readItem('sites', config.public.siteId, {
                fields: ['preview']
            })
            )

        const redirectPath = '/preview'
        
        const policy = "Admin - Bypass Preview";

        if(sessionToken){
            try {
                const me = await directusServer.request(withToken(sessionToken, readMe({
                fields: [
                    'id',
                    'email',
                    'first_name',
                    'last_name',
                    {
                        policies: [{
                            policy: ['name']
                        }]
                    },
                    {
                        role: [{
                            policies: [{
                                policy: ['name']
                            }]
                        }]
                    }
                ],
                filter: {
                    _or: [
                        {
                            policies: {
                                policy: {
                                    name: { _eq: policy }
                                }
                            }
                        },
                        {
                            role: {
                                policies: {
                                    policy: {
                                        name: { _eq: policy }
                                    }
                                }
                            }
                        }
                    ]
                }
                })));
                if (me.policies) return;
            } catch(error) {
                console.log(error);
            }
        }
        // Skip redirect if toggle is off or already at target
        if (!site?.preview || event.path === redirectPath) return
        
        // Do the actual HTTP redirect
        return sendRedirect(event, redirectPath, 302)
	} catch (error){
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
	}
});
