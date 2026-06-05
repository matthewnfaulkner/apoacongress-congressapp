interface FieldMeta {
	id: string
	name: string
	type: string
}

interface SubmissionValue {
	field: string
	value?: string
	file?: string
}

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()
	const formData = await readMultipartFormData(event)
	const cookies = parseCookies(event)
	const bearerToken = getHeader(event, 'authorization')?.replace(/^Bearer\s+/, '') || null
	const sessionToken = cookies[config.sessionTokenName as string] || null
	const userToken = bearerToken ?? sessionToken
	const TOKEN = config.directusServerToken as string

	if (!formData) {
		throw createError({ statusCode: 400, statusMessage: 'Invalid submission' })
	}

	if (!TOKEN) {
		throw createError({
			statusCode: 500,
			statusMessage: 'DIRECTUS_SERVER_TOKEN is not defined. Check your .env file.',
		})
	}

	try {
		let flowId = ''
		let fields: FieldMeta[] = []

		for (const part of formData) {
			if (part.name === 'flowId') flowId = part.data.toString()
			else if (part.name === 'fields') fields = JSON.parse(part.data.toString())
		}

		if (!flowId) {
			throw createError({ statusCode: 400, statusMessage: 'flowId is required' })
		}

		const values: SubmissionValue[] = []

		for (const part of formData) {
			if (!part.name || !part.data) continue
			if (part.name === 'flowId' || part.name === 'fields') continue

			const matched = fields.find((f) => f.name === part.name)
			if (!matched) continue

			if (part.filename) {
				const blob = new Blob([new Uint8Array(part.data)], { type: part.type })
				const uploadFormData = new FormData()
				uploadFormData.append('file', blob, part.filename)

				const uploaded = (await directusServer.request(
					withToken(TOKEN, uploadFiles(uploadFormData))
				)) as { id?: string }

				if (uploaded?.id) {
					values.push({ field: matched.id, file: uploaded.id })
				}
			} else {
				values.push({ field: matched.id, value: part.data.toString() })
			}
		}

		const payload = {
			site: config.public.siteId,
			flow: flowId,
			values,
		}

		const token = userToken ?? TOKEN

		await directusServer.request(withToken(token, createItem('form_flow_submissions' as any, payload)))

		return { success: true }
	} catch (err: any) {
		if (err.statusCode) throw err
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
	}
})
