import { fetchKnowledgeChunks, getEmbeddings } from '../../utils/knowledge-base';
import type { KnowledgeIndex } from '../../utils/knowledge-base';

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();

	// Protect with a shared secret
	const body = await readBody(event);
	if (!config.rebuildIndexSecret || body?.secret !== config.rebuildIndexSecret) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
	}

	if (!config.voyageApiKey) {
		throw createError({ statusCode: 500, statusMessage: 'Voyage API key not configured' });
	}

	const chunks = await fetchKnowledgeChunks(config.public.siteId as string);

	if (chunks.length === 0) {
		throw createError({ statusCode: 500, statusMessage: 'No content found to index' });
	}

	const embeddings = await getEmbeddings(
		chunks.map((c) => c.content),
		config.voyageApiKey,
	);

	const indexed = chunks.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] }));

	const index: KnowledgeIndex = {
		chunks: indexed,
		createdAt: new Date().toISOString(),
	};

	const storage = useStorage('data');
	await storage.setItem('knowledge-index', index);

	return {
		success: true,
		chunks: indexed.length,
		createdAt: index.createdAt,
	};
});
