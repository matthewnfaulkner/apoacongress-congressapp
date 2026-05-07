import { createDirectus, createItem, rest, uploadFiles, withToken } from '@directus/sdk'

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
	const cookie = getHeader(event, 'cookie') ?? ''
	const cookies = parseCookies(event)
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

	const userDirectus = createDirectus(config.public.directusUrl as string).with(
		rest({
			onRequest: (options) => ({
				...options,
				headers: { ...options.headers, cookie },
			}),
		})
	)

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
				const blob = new Blob([part.data], { type: part.type })
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
			flow: flowId,
			values,
		}

		const isAuthenticated = !!cookies[config.sessionTokenName as string]

		if (isAuthenticated) {
			await userDirectus.request(createItem('form_flow_submissions', payload))
		} else {
			await userDirectus.request(withToken(TOKEN, createItem('form_flow_submissions', payload)))
		}

		return { success: true }
	} catch (err: any) {
		if (err.statusCode) throw err
		throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
	}
})
