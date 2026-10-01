/** Only a presentation hint; Supabase still verifies every session before opening the library. */
export function canPreviewWelcome(storage, url, location) {
  if (/[#?&](?:access_token|refresh_token|code|error|type)=/.test(location.hash + location.search))
    return false;
  try {
    const project = new URL(url).hostname.split('.')[0];
    return !storage.getItem(`sb-${project}-auth-token`);
  } catch {
    return false;
  }
}
