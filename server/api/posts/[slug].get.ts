import type { Post } from '#shared/types/schema';
import type { H3Event } from 'h3';

const postFields = [
	'id', 'title', 'content', 'status', 'published_at',
	'description', 'slug', 'seo',
	{ image: ['id', 'filename_download', 'type'] },
	{ author: ['id', 'first_name', 'last_name', { avatar: ['id', 'filename_download', 'type'] }] },
];

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const slug = getRouterParam(event, 'slug');

	if (!slug) {
		throw createError({ statusCode: 400, message: 'Slug is required' });
	}

	const query = getQuery(event);
	const { preview, id, version } = query;

	// cachedEventHandler below always stamps a public, 1hr Cache-Control onto
	// the response — even when shouldBypassCache skips the server-side cache
	// storage — because that header gets set unconditionally before our own
	// handler's headers are copied over. Without this override, a preview
	// request fetches fresh data but tells the browser (and any CDN) to cache
	// *that* response for an hour, so reloading just replays stale preview
	// content instead of hitting the server again.
	if (preview === 'true') {
		setHeader(event, 'cache-control', 'no-store');
	}

	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;

	// Preview mode authorizes off the logged-in user's own session (bearer
	// header from the JSON token storage, or the session cookie for SSR) —
	// Directus's own permissions decide what they can see. Outside of preview
	// mode we never send the caller's identity, so the response is always the
	// plain public/published view regardless of who's logged in.
	const userToken = preview === 'true' ? bearerToken ?? cookies[config.sessionTokenName] ?? null : null;

	try {
		let post: Post;
		let postId = id as string;

		if (version && !postId) {
			const postIdLookup = await directusServer.request(
				withToken(
					userToken as string,
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
					userToken as string,
					readItem('posts', postId, {
						version: String(version),
						fields: postFields as any,
					}),
				),
			)) as unknown as Post;
		} else {
			const postsData = await directusServer.request(
				withToken(
					userToken as string,
					readItems('posts', {
						filter: userToken ? { slug: { _eq: slug } } : { slug: { _eq: slug }, status: { _eq: 'published' } },
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

		// Always the plain public view — related posts are never draft content,
		// so there's no reason for this to carry the caller's identity.
		const relatedPosts = await directusServer.request(
			readItems('posts', {
				filter: { slug: { _neq: slug }, status: { _eq: 'published' } },
				fields: ['id', 'title', 'slug', { image: ['id', 'filename_download', 'type'] }],
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