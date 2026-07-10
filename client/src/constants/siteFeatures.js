/** Donations are live when enabled in Admin Settings (or via VITE_DONATE_LIVE for overrides). */
export function isDonatePageLive(settings) {
  if (settings?.donatePageLive === true || settings?.donatePageLive === 'true') return true;
  return import.meta.env.VITE_DONATE_LIVE === 'true';
}
