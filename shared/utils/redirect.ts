/**
 * Only same-origin relative paths are safe post-login redirect targets.
 * Blocks absolute URLs (https://evil.com) and protocol-relative ones
 * (//evil.com - browsers still resolve that to a different host even though
 * it "starts with /").
 */
export function isSafeRedirect(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
}
