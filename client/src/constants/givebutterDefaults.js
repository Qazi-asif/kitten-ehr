export const DEFAULT_GIVEBUTTER_ACCOUNT = 'MW5zW87vHahaqHQX';

/** One-time donation, not linked to a kitten (pQq5xn). */
export const DEFAULT_GIVEBUTTER_DONATE_WIDGET_ID = 'pQq5xn';
export const DEFAULT_GIVEBUTTER_DONATE_URL = 'https://givebutter.com/pawsitivetransformations';

/** Recurring monthly donation — Nine Lives Club (p5MzyA). */
export const DEFAULT_GIVEBUTTER_NINE_LIVES_WIDGET_ID = 'p5MzyA';
export const DEFAULT_GIVEBUTTER_NINE_LIVES_URL = 'https://givebutter.com/ninelivesclub';

/** One-time donation to sponsor a kitten (gV1nYk). */
export const DEFAULT_GIVEBUTTER_SPONSOR_WIDGET_ID = 'gV1nYk';
export const DEFAULT_GIVEBUTTER_SPONSOR_URL = 'https://givebutter.com/sponsorakitten';

/** PayPal secondary giving channel. */
export const DEFAULT_PAYPAL_URL = 'https://www.paypal.biz/pawsitivetransform';

/** Donate page: script + widget (amounts configured in Givebutter dashboard). */
export const DEFAULT_GIVEBUTTER_EMBED = `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}"></script>
<givebutter-widget id="${DEFAULT_GIVEBUTTER_DONATE_WIDGET_ID}"></givebutter-widget>`;

/** Sponsor a Kitten widget. */
export const DEFAULT_GIVEBUTTER_SPONSOR_EMBED = `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}"></script>
<givebutter-widget id="${DEFAULT_GIVEBUTTER_SPONSOR_WIDGET_ID}"></givebutter-widget>`;

/** Nine Lives Club recurring widget. */
export const DEFAULT_GIVEBUTTER_NINE_LIVES_EMBED = `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}"></script>
<givebutter-widget id="${DEFAULT_GIVEBUTTER_NINE_LIVES_WIDGET_ID}"></givebutter-widget>`;

function extractCampaignFromEmbed(code) {
  const campaignAttr = code.match(/campaign=["']([^"']+)["']/i);
  if (campaignAttr?.[1]) return campaignAttr[1];

  const widgetAttr = code.match(/<givebutter-widget[^>]*\bid=["']([^"']+)["']/i);
  if (widgetAttr?.[1]) return widgetAttr[1];

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
