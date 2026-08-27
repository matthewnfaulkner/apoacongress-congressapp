interface SubmissionValueInput {
	id?: string;
	field: string;
	value: string;
}

interface FigureInput {
	id?: string;
	file: string;
	label: string;
}

interface SubmissionBody {
	id?: string;
	turnstileToken?: string;
	keywords?: string[];
	figures?: FigureInput[];
	submissionValues?: SubmissionValueInput[];
}

// Moved server-side so Turnstile can actually be enforced (the client-side
// widget alone doesn't stop anything — see submission.vue history) and so
// the write happens under a real, freshly-checked session rather than
// whatever the browser claims. No static/bot token fallback: an unauthenticated
// caller is rejected outright rather than falling back to a privileged token,
// unlike server/api/forms/submit.post.ts.
export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const cookies = parseCookies(event);
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = bearerToken ?? cookies[config.sessionTokenName as string] ?? null;

	if (!sessionToken) {
		throw createError({ statusCode: 401, statusMessage: 'You must be logged in to submit an abstract.' });
	}

	let userId: string;
	try {
		const user = await directusServer.request<{ id: string }>(withToken(sessionToken, readMe({ fields: ['id'] })));
		userId = user.id;
	} catch {
		throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session.' });
	}

	const body = await readBody<SubmissionBody>(event);

	if (!body?.turnstileToken) {
		throw createError({ statusCode: 400, statusMessage: 'Missing CAPTCHA token.' });
	}

	const captcha = await verifyTurnstileToken(body.turnstileToken, event);
	if (!captcha.success) {
		throw createError({ statusCode: 403, statusMessage: 'CAPTCHA verification failed.' });
	}

	// Resolved from siteId server-side rather than trusting a client-supplied id -
	// otherwise a client could point at a different abstracts config with no
	// deadline/limit and bypass both checks below.
	const [abstractConfig] = await directusServer.request<Array<{ id: string; submission_deadline: string | null; submission_limit: number | null }>>(
		withToken(
			sessionToken,
			readItems('abstracts', {
				limit: 1,
				fields: ['id', 'submission_deadline', 'submission_limit'],
				filter: { congress: { site: { _eq: config.public.siteId } } },
			}),
		),
	);

	if (!abstractConfig) {
		throw createError({ statusCode: 400, statusMessage: 'No abstract submission is configured for this site.' });
	}

	if (abstractConfig.submission_deadline && new Date(abstractConfig.submission_deadline) < new Date()) {
		throw createError({ statusCode: 403, statusMessage: 'The deadline for abstract submission has passed.' });
	}

	if (body.id) {
		// Also doubles as an ownership check: if the policy scopes reads to the
		// caller's own submissions, a foreign id 404s/throws here rather than
		// leaking whether it exists.
		let existing: { status?: string | null };
		try {
			existing = await directusServer.request<{ status?: string | null }>(
				withToken(sessionToken, readItem('abstract_submissions', body.id, { fields: ['status'] })),
			);
		} catch {
			throw createError({ statusCode: 404, statusMessage: 'Submission not found.' });
		}

		if (existing.status !== 'submitted') {
			throw createError({ statusCode: 403, statusMessage: 'This submission can no longer be edited.' });
		}
	} else {
		const existingCount = await directusServer.request<Array<{ id: string }>>(
			withToken(
				sessionToken,
				readItems('abstract_submissions', {
					limit: -1,
					fields: ['id'],
					filter: { congress_abstract: { _eq: abstractConfig.id }, submitter: { _eq: userId } },
				}),
			),
		);

		if (existingCount.length >= (abstractConfig.submission_limit || 100)) {
			throw createError({ statusCode: 403, statusMessage: 'You have reached your submission limit.' });
		}
	}

	// submitter/congress_abstract are set from the verified session and
	// server-resolved config, not trusted from the body - the client has no
	// business asserting who it's submitting as or which config applies.
	const payload = {
		congress_abstract: abstractConfig.id,
		submitter: userId,
		keywords: body.keywords ?? [],
		figures: body.figures ?? [],
		submission_values: body.submissionValues ?? [],
	};

	try {
		if (body.id) {
			return await directusServer.request(withToken(sessionToken, updateItem('abstract_submissions', body.id, payload as any)));
		}

		return await directusServer.request(withToken(sessionToken, createItem('abstract_submissions', payload as any)));
	} catch (e) {
		console.error('Abstract submission failed:', e);
		throw createError({ statusCode: 403, statusMessage: 'Failed to save submission.' });
	}
});
