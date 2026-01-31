import { withoutTrailingSlash, withLeadingSlash } from 'ufo';
import type { Person } from '#shared/types/schema';

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
	const { id, fields, limit, page, search, filter } = query;  
    //const search = getRouterParam(event, 'search');
    const config = useRuntimeConfig();

	try {
		let persons: Person[];

        // Standard request: Use readItems with permalink filtering
        // Filter logic:
        // - If token exists: fetch any status (for preview mode)
        // - If no token: only fetch published content (for public viewing)
        const personData = await directusServer.request(
                readItems('persons', {
                    limit:  limit as number,
                    filter: filter as object,
                    search: search as string,
                    page: page as number,
                    fields: fields as any,
                }),
        );

        if (!personData.length) {
            throw createError({ statusCode: 404, statusMessage: 'Person not found' });
        }

        persons = personData as Person[];
		

		return persons;
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Person not found' });
	}
});
