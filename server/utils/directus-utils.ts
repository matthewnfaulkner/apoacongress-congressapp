export function getDirectusAssetURL(fileOrString: string | DirectusFile | null | undefined): string {
	if (!fileOrString) return '';

	const runtimeConfig = useRuntimeConfig();
	const directusUrl = runtimeConfig.public.directusUrl;

	if (typeof fileOrString === 'string') {
		return `${directusUrl}/assets/${fileOrString}`;
	}

	if (fileOrString.filename_download) {

		const extension = fileOrString.filename_download?.includes('.')
			? fileOrString.filename_download.split('.').pop()
			: fileOrString.type?.split('/').pop(); // fallback: derive from MIME type if no extension in filename

		return `${directusUrl}/assets/${fileOrString.id}.${extension}`

	}
	
	return `${directusUrl}/assets/${fileOrString.id}`;
}
