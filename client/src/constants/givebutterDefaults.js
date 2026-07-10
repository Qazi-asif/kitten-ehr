export const DEFAULT_GIVEBUTTER_ACCOUNT = 'MW5zW87vHahaqHQX';
export const DEFAULT_GIVEBUTTER_CAMPAIGN = 'other';

/** Script + inline form — script alone does not render a visible donation UI. */
export const DEFAULT_GIVEBUTTER_EMBED = `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}"></script>
<givebutter-giving-form campaign="${DEFAULT_GIVEBUTTER_CAMPAIGN}"></givebutter-giving-form>`;

function extractCampaignFromEmbed(code) {
  const campaignAttr = code.match(/campaign=["']([^"']+)["']/i);
  if (campaignAttr?.[1]) return campaignAttr[1];

  const pageParam = code.match(/[?&]p=([^&"'\s>]+)/i);
  if (pageParam?.[1]) return pageParam[1];

  return DEFAULT_GIVEBUTTER_CAMPAIGN;
}

/** Ensure embed includes a visible Givebutter element, not just the library script. */
export function ensureGivebutterEmbed(code) {
  const trimmed = code?.trim();
  if (!trimmed) return DEFAULT_GIVEBUTTER_EMBED;

  if (/<givebutter-/i.test(trimmed)) return trimmed;

  const campaign = extractCampaignFromEmbed(trimmed);
  return `${trimmed}\n<givebutter-giving-form campaign="${campaign}"></givebutter-giving-form>`;
}
