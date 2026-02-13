import type { CongressDay, CongressSession } from '#shared/types/schema';

/**
 * Page fields configuration for Directus queries
 *
 * This defines the complete field structure for pages including:
 * - Basic page metadata (title, id)
 * - SEO fields for search engine optimization
 * - Complex nested content blocks (hero, gallery, pricing, forms, etc.)
 * - All nested relationships and dynamic content fields
 */
const sectionFields = [
    'id',
    'title',
    'starttime',
    'endtime',
    {
        room: [
            'title'
        ]
    },
    {
        section: [
            '*'
        ]
    },
    {
        day: [
            '*'
        ]
    },
    {
        events: [
            'id',
            'relative_start',
            'duration',
            'title',
            {
                type: [
                    'id',
                    'collection',
                    {
                    item: {
                        plenaries: [
                        'id',
                        'topic'
                        ],
                        symposiums: [
                        '*'
                        ],
                        workshops: [
                        'id',
                        
                        ],
                        talks: [
                        'id',
                        'topic'
                        ],
                    }
                    },
                ]
            },
            {
                children: [
                    'id',
                    'relative_start',
                    'duration',
                    'title',
                    {
                        type: [
                            'id',
                            'collection',
                            {
                            item: {
                                plenaries: [
                                'id',
                                'topic'
                                ],
                                discussions: [
                                        'id',
                                        'topic'
                                        ],
                                symposiums: [
                                '*'
                                ],
                                workshops: [
                                'id',
                                
                                ],
                                talks: [
                                'id',
                                'topic'
                                ],
                            }
                            },
                        ]
                    },
                        {
                        assignments: [
                            '*',
                            {
                                person: [
                                    'id',
                                    'first_name',
                                    'last_name',
                                    'country'
                                ]
                            },
                            {
                                role: [
                                    '*'
                                ]
                            }
                        ]
                    }
                ]
            },
            {
                assignments: [
                    '*',
                    {
                        person: [
                            'id',
                            'first_name',
                            'last_name',
                            'country'
                        ]
                    },
                    {
                        role: [
                            '*'
                        ]
                    }
                ]
            }
        ]
    },
    {

        schedule: [
            '*',
            {
                day: [
                    '*',
                    {
                        congress: [
                            {
                                venue: [
                                    {
                                        rooms:[
                                            'id',
                                            'title'
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
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

    const { preview, token: rawToken, id, slug} = query;

    const config = useRuntimeConfig();
    // Security: Only accept tokens when preview mode is explicitly enabled
    // This prevents unauthorized access to draft content
    const token = preview === 'true' && rawToken ? String(rawToken) : null;

    try {
        let section: CongressSession[];
        
        // Standard request: Use readItems with permalink filtering
        // Filter logic:
        // - If token exists: fetch any status (for preview mode)
        // - If no token: only fetch published content (for public viewing)
        const sectionData = await directusServer.request(
            withToken(
                token as string,
                readItems('congress_sessions', {
                    fields: sectionFields as any,
                    sort: 'starttime',
                    filter: {
                        section: {
                            slug:
                                {
                                     _eq: slug as string
                                }
                        },
                        schedule: {
                            status: {
                                _eq: 'published'
                            }
                        }
                    },
                    deep: {
                        day: {
                            _sort: 'sort'
                        },
                        schedule: {
                            day: {
                                _filter: {
                                    congress: {
                                        site:{
                                            _eq: config.public.siteId
                                        }
                                    }
                                }
                            }
                        },
                        section: {
                            slug: {
                                    _filter: {
                                        _eq: slug as string
                                }
                            }
                        },
                        events:{
                            children: {
                                _sort: 'relative_start'
                            },
                            _sort: 'relative_start'
                        },
                        _sort: 'starttime'
                    }
                }),
            ),
        );

        if (!sectionData.length) {
            throw createError({ statusCode: 404, statusMessage: 'Section not found' });
        }

        section = sectionData as CongressSession[];
        

        return section;
    } catch {
        throw createError({ statusCode: 500, statusMessage: 'Section not found' });
    }
});
