export function useLivePreview() {
	return usePreviewMode({
		// Preview mode is just a ?preview=true flag — the actual authorization
		// to see unpublished content comes from the logged-in user's own
		// session (see one.get.ts), not a separate URL token.
		shouldEnable: () => {
			const route = useRoute();
			return !!route.query.preview;
		},

		// Without this, usePreviewMode's own default getState would still pull
		// a `token` param out of the URL and stash it in `state.token` — dead
		// weight now that nothing reads a URL token. Keep state empty.
		getState: (currentState) => currentState,
	});
}
