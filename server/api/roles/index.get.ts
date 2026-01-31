import { withoutTrailingSlash, withLeadingSlash } from 'ufo';
import type { Role } from '#shared/types/schema';

/**
 * Pages API Handler - Fetches individual pages by permalink
 *
 * Purpose: This handler is designed for website pages (homepage, about, contact, etc.) where you need to:
 * - Fetch pages by their permalink (URL path)
 * - Support complex page layouts with multiple content blocks
 * - Handle dynamic content blocks (hero, gallery, pricing, forms, etc.)
 * - Support preview mode for draft/unpublished content
 * - Handle version-specific content for content management workflows
 *
 * Key Features:
 * - Permalink-based routing (e.g., /about, /contact, /pricing)
 * - Preview mode with token authentication
 * - Version support for content management workflows
 * - Dynamic content blocks with real-time data fetching
 * - SEO metadata support
 */
export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const { id, fields, limit, page, search } = query;  
    //const search = getRouterParam(event, 'search');
    const config = useRuntimeConfig();

	try {
		let roles: Role[];

        // Standard request: Use readItems with permalink filtering
        // Filter logic:
        // - If token exists: fetch any status (for preview mode)
        // - If no token: only fetch published content (for public viewing)
        const rolesData = await directusServer.request(
                readItems('roles', {
                    limit:  limit as number,
                    search: search as string,
                    page: page as number,
                    fields: fields as any,
                }),
        );

        if (!rolesData.length) {
            throw createError({ statusCode: 404, statusMessage: 'Roles not found' });
        }

        roles = rolesData as Role[];
		

		return roles;
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Roles not found' });
	}
});
