export default defineEventHandler(async (event) => {
	try {
        const config = useRuntimeConfig()

        // Skip API routes, Nitro assets, favicon, etc.
        if (
        event.path.startsWith('/api') ||
        event.path.startsWith('/_nuxt') ||
        event.path === '/favicon.ico'
        ) {
        return
        }

        // Fetch backend settings for redirect
        const site = await directusServer.request(
            readItem('sites', config.public.siteId, {
                fields: ['preview']
            })
            )

        const redirectPath = '/preview'

        // Skip redirect if toggle is off or already at target
        if (!site?.preview || event.path === redirectPath) return

        // Do the actual HTTP redirect
        return sendRedirect(event, redirectPath, 302)
	} catch (error){
        console.log(error);
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
	}
});
