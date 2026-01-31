import { withoutTrailingSlash, withLeadingSlash } from 'ufo';
import type { Person } from '#shared/types/schema';

/**
 * Page fields configuration for Directus queries
 *
 * This defines the complete field structure for pages including:
 * - Basic page metadata (title, id)
 * - SEO fields for search engine optimization
 * - Complex nested content blocks (hero, gallery, pricing, forms, etc.)
 * - All nested relationships and dynamic content fields
 */
const personFields = [
	'title',
	'id',
    'country',
    'first_name',
    'last_name',
    'title',
    'qualifications',
    'image',
    'bio',
    {
        committee_positions:[
            {
                committee_positions_id: [
                    'title',
                {
                    committee: [
                        'title',
                        'congress'
                    ]
                }
                ] 
            }
        ]
    },
    {
        assignments: [
            'id',
            {
                event: [
                    '*',
                    {
                        parent: [
                            '*',
                            {
                                session: [
                                '*',
                                {
                                    schedule: [
                                            '*',
                                            {
                                                day: [
                                                    '*'
                                                ]
                                            }
                                        ]
                                },
                                {
                                    room: [
                                        '*'
                                    ]
                                },
                                {
                                    section: [
                                        '*'
                                    ]
                                }
                            ]
                        }
                        ]
                        
                    },
                    {
                        session: [
                            '*',
                            {
                                schedule: [
                                    '*',
                                    {
                                        day: [
                                            '*'
                                        ]
                                    }
                                ]
                            },
                            {
                                room: [
                                    '*'
                                ]
                            },
                            {
                                section: [
                                    '*'
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                role: [
                    '*'
                ]
            }
        ]
    }
];

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

	const { preview, token: rawToken, id, } = query;

    const config = useRuntimeConfig();
	// Security: Only accept tokens when preview mode is explicitly enabled
	// This prevents unauthorized access to draft content
	const token = preview === 'true' && rawToken ? String(rawToken) : null;

	try {
		let person: Person;
		let personId = id as string;

        // Standard request: Use readItems with permalink filtering
        // Filter logic:
        // - If token exists: fetch any status (for preview mode)
        // - If no token: only fetch published content (for public viewing)
        const personData = await directusServer.request(
            withToken(
                token as string,
                readItems('persons', {
                    filter: 
                        { id: { _eq: personId } },
                    limit: 1,
                    fields: personFields as any,
                    deep: {
                        committee_positions: {
                            _filter: {
                                committee_positions_id: {
                                    committee: {
                                        congress: {
                                            _eq: config.public.congressId
                                        }
                                    }
                                }
                            }
                        },
                        assignments: {
                            _filter: {
                                event: {
                                    _or: [
                                        {
                                    session: {
                                        schedule: {
                                            day: {
                                                congress: {
                                                    _eq: config.public.congressId
                                                    }
                                            }
                                        },
                                    }},
                                    {parent: {
                                        session: {
                                            schedule: {
                                                day: {
                                                    congress: {
                                                        _eq: config.public.congressId
                                                        }
                                                }
                                            }
                                        }
                                    }
                                }
                                ]
                                }
                        }
                    }
                    }
                }),
            ),
        );

        if (!personData.length) {
            throw createError({ statusCode: 404, statusMessage: 'Person not found' });
        }

        person = personData[0] as Person;
		

		return person;
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Person not found' });
	}
});
