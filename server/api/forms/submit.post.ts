interface SubmissionValue {
	field: string;
	value?: string;
	file?: string;
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
		let fields = [];

		for (const field of formData) {
			if (field.name === 'formId') {
				formId = field.data.toString();
			} else if (field.name === 'fields') {
				fields = JSON.parse(field.data.toString());
			}
		}

		for (const field of formData) {
			if (!field.name || !field.data) continue;
			if (field.name === 'formId' || field.name === 'fields') continue;

			const matchingField = fields.find((f: { name: string | undefined }) => f.name === field.name);
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
				submissionValues.push({ field: matchingField.id, value: field.data.toString() });
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

		return { success: true, id: submission.id };
	} catch (e) {
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' });
	}
});
