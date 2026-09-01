interface SubmissionValue {
	field: string;
	value?: string;
	file?: string;
}

interface FormFieldRow {
	id: string;
	name: string | null;
	type: string | null;
	policy: string | null;
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig();
	const formData = await readMultipartFormData(event);
	const cookies = parseCookies(event);
	// Production: access token sent as Authorization: Bearer header (localStorage-based json auth)
	// Sandbox: session token in cookie (cookie-based session auth)
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null;
	const sessionToken = cookies[config.sessionTokenName as string] || null;
	const userToken = bearerToken ?? sessionToken;
	const TOKEN = config.directusServerToken as string;

	if (!formData) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid form submission' });
	}

	if (!TOKEN) {
		throw createError({ statusCode: 500, statusMessage: 'DIRECTUS_SERVER_TOKEN is not defined.' });
	}

	try {
		const submissionValues: SubmissionValue[] = [];
		let formId = '';
		let turnstileToken = '';

		for (const field of formData) {
			if (field.name === 'formId') {
				formId = field.data.toString();
			} else if (field.name === 'turnstileToken') {
				turnstileToken = field.data.toString();
			}
		}

		if (!formId) {
			throw createError({ statusCode: 400, statusMessage: 'formId is required.' });
		}

		let botProtection = true;
		let formFieldRows: FormFieldRow[] = [];
		try {
			// Field defs fetched here rather than trusted from the client's own
			// "fields" payload (as before) — a policy consent is a
			// compliance-relevant record, so which policy/type a field actually
			// is shouldn't be something a request can spoof. Also closes a
			// pre-existing gap: the old client-supplied field ids could point at
			// any form_fields row at all, not just ones belonging to this form.
			const form = await directusServer.request<{ bot_protection?: boolean | null; fields?: FormFieldRow[] }>(
				withToken(TOKEN, readItem('forms', formId, {
					fields: ['bot_protection', { fields: ['id', 'name', 'type', 'policy'] }],
				})),
			);
			botProtection = form?.bot_protection !== false;
			formFieldRows = form?.fields ?? [];
		} catch {
			throw createError({ statusCode: 400, statusMessage: 'Invalid form.' });
		}

		if (botProtection) {
			if (!turnstileToken) {
				throw createError({ statusCode: 400, statusMessage: 'Missing CAPTCHA token.' });
			}
			const captcha = await verifyTurnstileToken(turnstileToken, event);
			if (!captcha.success) {
				throw createError({ statusCode: 403, statusMessage: 'CAPTCHA verification failed.' });
			}
		}

		const fieldsByName = new Map(formFieldRows.filter((f) => f.name).map((f) => [f.name as string, f]));

		// "email" — same field name convention as the checkout_form's own
		// first-name/last-name/email fields (see getFormSubmissionContactDetails)
		// — is the only way to attribute a guest's policy consent to anyone;
		// a logged-in submitter is identified via userId instead, below.
		let submittedEmail: string | null = null;
		const policyConsents: Array<{ policyId: string; consent: boolean }> = [];

		for (const field of formData) {
			if (!field.name || !field.data) continue;
			if (field.name === 'formId' || field.name === 'fields' || field.name === 'turnstileToken') continue;

			const matchingField = fieldsByName.get(field.name);
			if (!matchingField) continue;

			if (field.filename) {
				const blob = new Blob([field.data], { type: field.type });
				const uploadFormData = new FormData();
				uploadFormData.append('file', blob, field.filename);

				const uploadedFile = (await directusServer.request(
					withToken(TOKEN, uploadFiles(uploadFormData))
				)) as { id?: string };

				if (uploadedFile?.id) {
					submissionValues.push({ field: matchingField.id, file: uploadedFile.id });
				}
			} else {
				const value = field.data.toString();
				submissionValues.push({ field: matchingField.id, value });

				if (matchingField.type === 'policy' && matchingField.policy) {
					policyConsents.push({ policyId: matchingField.policy, consent: value === 'true' });
				}
				if (matchingField.name === 'email' && !submittedEmail) {
					submittedEmail = value;
				}
			}
		}

		const payload = {
			form: formId,
			site: config.public.siteId,
			values: submissionValues,
		};

		const token = userToken ?? TOKEN;

		const submission = await directusServer.request<{ id: string }>(
			withToken(token, createItem('form_submissions' as any, payload)),
		);

		// Records each policy-type field as a real user_policy_agreements row —
		// attributed to the logged-in user if there is one, otherwise to
		// whatever "email" field this same submission carried. A guest
		// submission with neither has nothing to attribute consent to, so
		// those are skipped rather than recorded anonymously. Best-effort:
		// logged, not thrown — a failure here shouldn't undo the (already
		// committed) form_submissions row above.
		if (policyConsents.length) {
			let userId: string | null = null;

			if (userToken) {
				try {
					const me = await directusServer.request<{ id: string }>(withToken(userToken, readMe({ fields: ['id'] })));
					userId = me.id;
				} catch {
					userId = null;
				}
			}

			if (userId || submittedEmail) {
				const identity = userId ? { user: { _eq: userId } } : { email: { _eq: submittedEmail } };

				await Promise.all(
					policyConsents.map(async (pc) => {
						try {
							// Updates the existing agreement rather than always creating a
							// new one — otherwise a user resubmitting the same (or any
							// other) form with this policy field repeatedly accumulates
							// duplicate "active" rows for the same policy, instead of
							// there being one current record of consent per policy.
							const existing = await directusServer.request<Array<{ id: string }>>(
								withToken(TOKEN, readItems('user_policy_agreements' as any, {
									filter: { policy: { _eq: pc.policyId }, ...identity },
									limit: 1,
									fields: ['id'],
								})),
							);

							if (existing[0]) {
								await directusServer.request(
									withToken(TOKEN, updateItem('user_policy_agreements' as any, existing[0].id, {
										consent: pc.consent,
										active: true,
									})),
								);
							} else {
								await directusServer.request(
									withToken(TOKEN, createItem('user_policy_agreements' as any, {
										policy: pc.policyId,
										consent: pc.consent,
										active: true,
										...(userId ? { user: userId } : { email: submittedEmail }),
									})),
								);
							}
						} catch (error) {
							console.error('[forms/submit] Failed to record policy agreement:', error);
						}
					}),
				);
			}
		}

		return { success: true, id: submission.id };
	} catch (e: any) {
		if (e.statusCode) throw e;
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
	}
});
