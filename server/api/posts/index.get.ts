import { z } from 'zod';
import type { H3Event } from 'h3';

const querySchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(6),
	page: z.coerce.number().min(1).default(1),
});

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const query = await getValidatedQuery(event, querySchema.safeParse);

	if (!query.success) {
		throw createError({ statusCode: 400, message: 'Invalid query parameters' });
	}

	const { limit, page } = query.data;
	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	try {
		const [posts, count] = await Promise.all([
			directusServer.request(
				sessionToken
					? withToken(sessionToken, readItems('posts', {
						limit, page,
						sort: ['-published_at'],
						fields: ['id', 'title', 'description', 'slug', 'image'],
						filter: { status: { _eq: 'published' } },
					}))
					: readItems('posts', {
						limit, page,
						sort: ['-published_at'],
						fields: ['id', 'title', 'description', 'slug', 'image'],
						filter: { status: { _eq: 'published' } },
					}),
			),
			directusServer.request(
				sessionToken
					? withToken(sessionToken, readItems('posts', {
						aggregate: { count: '*' },
						filter: { status: { _eq: 'published' } },
					}))
					: readItems('posts', {
						aggregate: { count: '*' },
						filter: { status: { _eq: 'published' } },
					}),
			),
		]);

		return {
			posts,
			count: Number((count[0] as any)?.count) || 0,
		};
	} catch {
		throw createError({ statusCode: 500, message: 'Failed to fetch paginated posts' });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 60,
		getKey: (event) => {
			const { limit, page } = getQuery(event);
			return `posts-${page ?? 1}-${limit ?? 6}`;
		},
		shouldBypassCache: () => true,
	});
