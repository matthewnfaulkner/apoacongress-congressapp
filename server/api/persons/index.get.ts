import type { Person } from '#shared/types/schema';
import type { H3Event } from 'h3';

const config = useRuntimeConfig();

async function handler(event: H3Event) {
	const { fields, limit, page, search, filter } = getQuery(event);

	const cookies = parseCookies(event);
	const sessionToken = cookies[config.sessionTokenName];

	const params = {
		limit: limit as number,
		filter: filter as object,
		search: search as string,
		page: page as number,
		fields: fields as any,
	};

	try {
		const personData = await directusServer.request(
			sessionToken
				? withToken(sessionToken, readItems('persons', params))
				: readItems('persons', params),
		);

		if (!personData.length) {
			throw createError({ statusCode: 404, statusMessage: 'Person not found' });
		}

		return personData as unknown as Person[];
	} catch {
		throw createError({ statusCode: 500, statusMessage: 'Person not found' });
	}
}

export default config.public.isSandbox
	? eventHandler(handler)
	: cachedEventHandler(handler, {
		maxAge: 3600,
		getKey: (event) => {
			const { limit, page, search, filter } = getQuery(event);
			return `persons-${page ?? 1}-${limit ?? ''}-${search ?? ''}-${JSON.stringify(filter ?? '')}`;
		},
		shouldBypassCache: () => true,
	});
