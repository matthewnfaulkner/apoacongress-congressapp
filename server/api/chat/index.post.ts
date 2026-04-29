import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getEmbeddings, findRelevantChunks } from '../../utils/knowledge-base';
import type { KnowledgeIndex } from '../../utils/knowledge-base';

export default defineEventHandler(async (event) => {

	const body = await readBody(event);
	const messages = body?.messages ?? [];

	const config = useRuntimeConfig();

	if (!config.anthropicApiKey) {
		throw createError({ statusCode: 500, statusMessage: 'Anthropic API key not configured' });
	}

	if (!config.public.enableChatAgent) {
		throw createError({ statusCode: 500, statusMessage: 'Chat Agent not Enabled' });
	}

	// Verify the user is authenticated via their Directus session cookie
	const sessionToken = getCookie(event, config.sessionTokenName);
	if (!sessionToken) {
		throw createError({ statusCode: 401, statusMessage: 'Authentication required' });
	}
	try {
		await directusServer.request(withToken(sessionToken, readMe()));
	} catch {
		throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session' });
	}
	
	// Extract the last user query for RAG lookup
	const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
	const query: string = lastUserMsg
		? Array.isArray(lastUserMsg.content)
			? (lastUserMsg.content.find((p: any) => p.type === 'text')?.text ?? '')
			: (lastUserMsg.parts?.find((p: any) => p.type === 'text')?.text ?? lastUserMsg.content ?? '')
		: '';

	// RAG: embed query and find relevant chunks
	let contextText = '';
	if (query && config.voyageApiKey) {
		try {
			const storage = useStorage('data');
			const index = await storage.getItem<KnowledgeIndex>('knowledge-index');

			if (index?.chunks?.length) {
				const embeddings = await getEmbeddings([query], config.voyageApiKey);
				const queryEmbedding = embeddings[0];
				if (!queryEmbedding) return;
				const relevant = findRelevantChunks(queryEmbedding, index.chunks, 5);
				contextText = relevant.map((c) => c.content).join('\n\n---\n\n');
			}
		} catch {
			// Degrade gracefully — answer without retrieved context
		}
	}

	const anthropic = createAnthropic({ apiKey: config.anthropicApiKey });

	const systemPrompt = [
		'You are a helpful customer service assistant for APOA 2027 (Asia Pacific Orthopaedic Association Annual Congress) in Taipei, Taiwan.',
		'Be concise, friendly, and professional. Always respond in the same language the user writes in.',
		contextText
			? `\nUse the following conference information to answer questions accurately. If the answer is not covered, say so and suggest the user contact the organizers directly.\n\n--- KNOWLEDGE BASE ---\n${contextText}\n--- END KNOWLEDGE BASE ---`
			: '\nYou do not currently have access to specific conference details. Advise the user to check the official website or contact the organizers for accurate information.',
	].join('\n');

	const result = streamText({
		model: anthropic('claude-haiku-4-5'),
		system: systemPrompt,
		messages: messages.map((m: any) => ({
			role: m.role as 'user' | 'assistant',
			content: (m.parts?.find((p: any) => p.type === 'text')?.text ?? m.content ?? '') as string,
		})),
		tools: {
			suggestSupportForm: tool({
			description: 'Call this when you cannot answer the user\'s question from the available knowledge base, to offer them a support request form.',
			inputSchema: z.object({
				reason: z.string().describe('Brief explanation shown to the user of why you are suggesting the form'),
			}),
			}),
		}
	});

	return result.toUIMessageStreamResponse();
});
