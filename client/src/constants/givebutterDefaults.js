export const DEFAULT_GIVEBUTTER_ACCOUNT = 'MW5zW87vHahaqHQX';
export const DEFAULT_GIVEBUTTER_WIDGET_ID = 'gV1nYk';

/** Donate page: script + inline form (amounts configured in Givebutter dashboard). */
export const DEFAULT_GIVEBUTTER_EMBED = `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}"></script>
<givebutter-giving-form campaign="other"></givebutter-giving-form>`;

/** Sponsor a Kitten: approved widget from Website Copy Master Doc Section 10. */
export const DEFAULT_GIVEBUTTER_SPONSOR_EMBED = `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}"></script>
<givebutter-widget id="${DEFAULT_GIVEBUTTER_WIDGET_ID}"></givebutter-widget>`;

function extractCampaignFromEmbed(code) {
  const campaignAttr = code.match(/campaign=["']([^"']+)["']/i);
  if (campaignAttr?.[1]) return campaignAttr[1];

  const pageParam = code.match(/[?&]p=([^&"'\s>]+)/i);
  if (pageParam?.[1]) return pageParam[1];

  return 'other';
}

/** Ensure embed includes a visible Givebutter element, not just the library script. */
export function ensureGivebutterEmbed(code) {
  const trimmed = code?.trim();
  if (!trimmed) return DEFAULT_GIVEBUTTER_EMBED;

  if (/<givebutter-/i.test(trimmed)) return trimmed;

  const campaign = extractCampaignFromEmbed(trimmed);
  return `${trimmed}\n<givebutter-giving-form campaign="${campaign}"></givebutter-giving-form>`;
}
