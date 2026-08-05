import { getDirectusAssetURL } from '@@/server/utils/directus-utils';

// <img>/<a> tags don't send credentials on cross-origin requests by default
// (sandbox mode needs the session cookie) and can't carry an Authorization
// header at all (production's json mode needs the bearer token). Fetching the
// asset ourselves with the current user's credentials and exposing it as a
// data URI works uniformly in both auth modes — blob: object URLs would need
// the app's img-src CSP directive widened, data: is already allowed.
export function useAuthenticatedAsset() {
  const { $directus } = useNuxtApp();

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function fetchAssetUrl(file: { id: string } | string | null | undefined): Promise<string> {
    if (!file) return '';
    const assetUrl = getDirectusAssetURL(file);

    try {
      const token = await $directus.getToken();
      const response = await fetch(assetUrl, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        console.error('fetchAssetUrl: request failed', assetUrl, response.status, await response.text().catch(() => ''));
        return '';
      }

      const blob = await response.blob();
      return await blobToDataUrl(blob);
    } catch (error) {
      console.error('fetchAssetUrl: fetch threw', assetUrl, error);
      return '';
    }
  }

  return { fetchAssetUrl };
}
