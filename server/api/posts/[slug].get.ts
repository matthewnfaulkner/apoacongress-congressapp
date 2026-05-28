import type { Post } from '#shared/types/schema';
import type { H3Event } from 'h3';

const postFields = [
	'id', 'title', 'content', 'status', 'published_at',
	'image', 'description', 'slug', 'seo',
	{ author: ['id', 'first_name', 'last_name', 'avatar'] },
];

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({ statusCode: 400, message: 'Slug is required' });
	}

	const query = getQuery(event);
	const { preview, token: rawToken, id, version } = query;
	const token = preview === 'true' && rawToken ? String(rawToken) : null;

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];
	const authToken = (token ?? sessionToken) as string;

	try {
		let post: Post;
		let postId = id as string;

		if (version && !postId) {
			const postIdLookup = await directusServer.request(
				withToken(
					authToken,
					readItems('posts', {
						filter: { slug: { _eq: slug } },
						limit: 1,
						fields: ['id'],
					}),
				),
			);
			postId = postIdLookup.length > 0 ? postIdLookup[0]?.id || '' : '';

			if (version && !postId) {
				throw createError({ statusCode: 404, message: `Post not found for slug "${slug}" and version "${version}"` });
			}
		}

		if (version && postId) {
			post = (await directusServer.request(
				withToken(
					authToken,
					readItem('posts', postId, {
						version: String(version),
						fields: postFields as any,
					}),
				),
			)) as unknown as Post;
		} else {
			const postsData = await directusServer.request(
				withToken(
					authToken,
					readItems('posts', {
						filter: token ? { slug: { _eq: slug } } : { slug: { _eq: slug }, status: { _eq: 'published' } },
						limit: 1,
						fields: postFields as any,
					}),
				),
			);

			if (!postsData.length) {
				throw createError({ statusCode: 404, message: `Post not found: ${slug}` });
			}

			post = postsData[0] as Post;
		}

		const relatedPosts = await directusServer.request(
			sessionToken
				? withToken(sessionToken, readItems('posts', {
					filter: { slug: { _neq: slug }, status: { _eq: 'published' } },
					fields: ['id', 'title', 'image', 'slug'],
					limit: 2,
				}))
				: readItems('posts', {
					filter: { slug: { _neq: slug }, status: { _eq: 'published' } },
					fields: ['id', 'title', 'image', 'slug'],
					limit: 2,
				}),
		);

		return { post, relatedPosts };
	} catch (error) {
		throw createError({ statusCode: 500, message: `Failed to fetch post: ${slug}`, data: error });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => `post-${getRouterParam(event, 'slug')}`,
		shouldBypassCache: (event) => getQuery(event).preview === 'true',
	});