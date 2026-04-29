import { $fetch } from 'ofetch';
import { directusServer, readItem, readItems } from './directus-server';

export interface KnowledgeChunk {
	id: string;
	content: string;
	metadata: {
		type: string;
		title?: string;
		url?: string;
	};
	embedding?: number[];
}

export interface KnowledgeIndex {
	chunks: KnowledgeChunk[];
	createdAt: string;
}

function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\s+/g, ' ')
		.trim();
}

export function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let magA = 0;
	let magB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		magA += a[i] * a[i];
		magB += b[i] * b[i];
	}
	const denom = Math.sqrt(magA) * Math.sqrt(magB);
	return denom === 0 ? 0 : dot / denom;
}

export async function getEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
	const BATCH_SIZE = 128;
	const allEmbeddings: number[][] = [];

	for (let i = 0; i < texts.length; i += BATCH_SIZE) {
		const batch = texts.slice(i, i + BATCH_SIZE);
		const response = await $fetch<{ data: Array<{ embedding: number[] }> }>(
			'https://api.voyageai.com/v1/embeddings',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ input: batch, model: 'voyage-3' }),
			},
		);
		allEmbeddings.push(...response.data.map((d) => d.embedding));
	}

	return allEmbeddings;
}

export async function fetchKnowledgeChunks(siteId: string): Promise<KnowledgeChunk[]> {
	const chunks: KnowledgeChunk[] = [];

	// --- Congress general info, venue & charges ---
	const congressData = await directusServer.request(
		readItems('congress', {
			filter: { site: { _eq: siteId } } as any,
			limit: 1,
			fields: [
				'id',
				'title',
				'startdate',
				'enddate',
				{ venue: ['id', 'title', 'airport_codes', { rooms: ['id', 'title'] }] },
				{ charges: ['id', 'delegate', 'category', 'sub_category', 'price'] },
				{ abstracts: ['id', 'submission_deadline', 'submission_limit', 'description', 'categories']}
			] as any,
		}),
	);

	if (congressData.length > 0) {
		const congress = congressData[0] as any;

		chunks.push({
			id: 'congress-general',
			content: [
				`Conference: ${congress.title}`,
				congress.startdate ? `Start date: ${congress.startdate}` : null,
				congress.enddate ? `End date: ${congress.enddate}` : null,
				congress.venue?.title ? `Venue: ${congress.venue.title}` : null,
				`Airport Codes: ${congress.venue.airport_codes}`
			]
				.filter(Boolean)
				.join('\n'),
			metadata: { type: 'congress', title: congress.title },
		});

		if (congress.venue?.rooms?.length) {
			chunks.push({
				id: 'congress-venue',
				content: `Venue: ${congress.venue.title}\nRooms available: ${congress.venue.rooms.map((r: any) => r.title).join(', ')}`,
				metadata: { type: 'venue', title: congress.venue.title },
			});
		}

		if (congress.abstracts.length) {
			const abstracts = congress.abstracts[0];
			chunks.push({
				id: 'congress-abstracts',
				content: [
					`Guidelines: ${abstracts.description}`,
					`Submission Deadline: ${abstracts.submission_deadline}`,
					abstracts.submission_limit ? `Submission Limit: ${abstracts.submission_limit}` : 'Submission Limit: no limit',
					`Categories: ${abstracts.categories.join('\n')}` 
				].filter(Boolean)
				.join('\n'),
				metadata: { type: 'abstracts', title: congress.title + ' Abstracts / Free Papers' },
			});
		}

		if (Array.isArray(congress.charges) && congress.charges.length > 0) {
			const chargeLines = congress.charges
				.map(
					(c: any) =>
						`${[c.delegate, c.category, c.sub_category].filter(Boolean).join(' / ')}: ${c.price ?? 'TBC'}`,
				)
				.join('\n');
			chunks.push({
				id: 'congress-charges',
				content: `Registration & Fees:\n${chargeLines}`,
				metadata: { type: 'pricing' },
			});
		}
	}

	// --- Visa & travel info ---
	const venueId = congressData.length > 0 ? (congressData[0] as any)?.venue?.id : null;
	if (venueId) {
		const venue = await directusServer.request(
			readItem('venues', venueId, {
				fields: [
					{
						visa_info_by_country: ['id', 'details', { countries: ['id', 'country'] }],
						travel_info_by_country: ['id', 'details', 'country'],
					},
				] as any,
			}),
		) as any;

		for (const info of venue?.visa_info_by_country ?? []) {
			if (!info.details) continue;
			const countryCodes: string[] = (info.countries ?? [])
				.map((c: any) => (typeof c === 'string' ? c : c.country))
				.filter(Boolean);
			const scope = countryCodes.length
				? `Applies to: ${countryCodes.join(', ')}`
				: 'General visa information (applies to all countries)';
			chunks.push({
				id: `visa-${info.id}`,
				content: `Visa Information\n${scope}\n${stripHtml(info.details)}`,
				metadata: { type: 'visa', title: 'Visa Information' },
			});
		}

		for (const info of venue?.travel_info_by_country ?? []) {
			if (!info.details) continue;
			const country = typeof info.country === 'string' ? info.country : info.country?.key ?? '';
			chunks.push({
				id: `travel-${info.id}`,
				content: `Travel Information${country ? ` for ${country}` : ''}\n${stripHtml(info.details)}`,
				metadata: { type: 'travel', title: `Travel Information${country ? ` — ${country}` : ''}` },
			});
		}
	}

	// --- Schedule ---
	const scheduleData = await directusServer.request(
		readItems('congress', {
			filter: { site: { _eq: siteId } } as any,
			limit: 1,
			fields: [
				'id',
				{
					days: [
						'id',
						'title',
						{
							schedules: [
								'id',
								'name',
								{
									sessions: [
										'id',
										'title',
										'starttime',
										'endtime',
										{ events: ['id', 'title'] },
									],
								},
							],
						},
					],
				},
			] as any,
			deep: {
				days: {
					schedules: { _filter: { status: { _eq: 'published' } } },
				},
			} as any,
		}),
	);

	if (scheduleData.length > 0) {
		const congress = scheduleData[0] as any;
		for (const day of congress.days ?? []) {
			for (const schedule of day.schedules ?? []) {
				const sessionLines = (schedule.sessions ?? [])
					.map((s: any) => {
						const time =
							s.starttime && s.endtime ? ` (${s.starttime}–${s.endtime})` : '';
						const eventTitles = (s.events ?? [])
							.map((e: any) => `  • ${e.title}`)
							.join('\n');
						return `Session: ${s.title}${time}${eventTitles ? '\n' + eventTitles : ''}`;
					})
					.join('\n');

				if (sessionLines) {
					chunks.push({
						id: `schedule-${day.id}-${schedule.id}`,
						content: `Day: ${day.title}\nSchedule: ${schedule.name}\n${sessionLines}`,
						metadata: {
							type: 'schedule',
							title: `${day.title} – ${schedule.name}`,
						},
					});
				}
			}
		}
	}

	// --- Published pages ---
	const pages = await directusServer.request(
		readItems('pages', {
			filter: { status: { _eq: 'published' }, site: { id: { _eq: siteId } } } as any,
			fields: ['id', 'title', 'permalink'] as any,
		}),
	);

	for (const page of pages as any[]) {
		chunks.push({
			id: `page-${page.id}`,
			content: `Page: ${page.title}\nURL: /${(page.permalink ?? '').replace(/^\/+/, '')}`,
			metadata: { type: 'page', title: page.title, url: `/${page.permalink}` },
		});
	}

	// --- Published posts ---
	const posts = await directusServer.request(
		readItems('posts', {
			filter: { status: { _eq: 'published' } } as any,
			fields: ['id', 'title', 'description', 'content', 'slug'] as any,
		}),
	);

	for (const post of posts as any[]) {
		const rawContent = [post.title, post.description, post.content]
			.filter(Boolean)
			.join('\n');
		const textContent = stripHtml(rawContent).substring(0, 2000);
		chunks.push({
			id: `post-${post.id}`,
			content: `Article: ${post.title}\n${textContent}`,
			metadata: { type: 'post', title: post.title, url: `/blog/${post.slug}` },
		});
	}

	return chunks;
}

export function findRelevantChunks(
	queryEmbedding: number[],
	chunks: KnowledgeChunk[],
	topK: number = 5,
): KnowledgeChunk[] {
	return chunks
		.filter((c) => c.embedding?.length)
		.map((chunk) => ({
			chunk,
			score: cosineSimilarity(queryEmbedding, chunk.embedding!),
		}))
		.sort((a, b) => b.score - a.score)
		.slice(0, topK)
		.map((s) => s.chunk);
}
