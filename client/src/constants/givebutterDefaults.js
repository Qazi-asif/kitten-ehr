export const DEFAULT_GIVEBUTTER_ACCOUNT = 'MW5zW87vHahaqHQX';

/**
 * CR-101: widget ids from each campaign's Share/Embed panel in the Givebutter
 * dashboard. These render the donation form inline via
 * `<givebutter-widget id="...">` so visitors never leave the site.
 *
 * If a campaign is rebuilt in Givebutter its widget id changes; update it here
 * (or override per-page from Settings) rather than falling back to a redirect.
 */
export const GIVEBUTTER_WIDGET_IDS = {
  /** General one-time donation. */
  donate: 'pQq5xn',
  /** Nine Lives Club, recurring monthly. */
  nineLives: 'p5MzyA',
  /** Kitten sponsorship. */
  sponsor: 'gV1nYk',
};

/**
 * Loader script that activates every `<givebutter-widget>` on the page.
 *
 * `latest.umd.cjs` is the URL Givebutter's dashboard currently hands out;
 * `latest.js` is the older alias for the same bundle. Override with
 * VITE_GIVEBUTTER_LOADER_SRC if Givebutter changes the documented snippet.
 */
export const GIVEBUTTER_LOADER_SRC = import.meta.env?.VITE_GIVEBUTTER_LOADER_SRC
  || `https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}&p=other`;

/** Custom element the loader must define before a widget can render. */
export const GIVEBUTTER_WIDGET_TAG = 'givebutter-widget';

/** One-time donation, not linked to a kitten. */
export const DEFAULT_GIVEBUTTER_DONATE_CAMPAIGN = 'pawsitivetransformations';
export const DEFAULT_GIVEBUTTER_DONATE_URL = 'https://givebutter.com/pawsitivetransformations';

/** Recurring monthly donation — Nine Lives Club. */
export const DEFAULT_GIVEBUTTER_NINE_LIVES_CAMPAIGN = 'ninelivesclub';
export const DEFAULT_GIVEBUTTER_NINE_LIVES_URL = 'https://givebutter.com/ninelivesclub';

/** One-time donation to sponsor a kitten. */
export const DEFAULT_GIVEBUTTER_SPONSOR_CAMPAIGN = 'sponsorakitten';
export const DEFAULT_GIVEBUTTER_SPONSOR_URL = 'https://givebutter.com/sponsorakitten';

/** PayPal secondary giving channel. */
export const DEFAULT_PAYPAL_URL = 'https://www.paypal.biz/pawsitivetransform';

const SCRIPT_TAG = `<script async src="https://widgets.givebutter.com/latest.umd.cjs?acct=${DEFAULT_GIVEBUTTER_ACCOUNT}"></script>`;

function givingFormEmbed(campaign) {
  return `${SCRIPT_TAG}
<givebutter-giving-form campaign="${campaign}"></givebutter-giving-form>`;
}

/** Donate page: script + inline form (campaign slug from public Givebutter URL). */
export const DEFAULT_GIVEBUTTER_EMBED = givingFormEmbed(DEFAULT_GIVEBUTTER_DONATE_CAMPAIGN);

/** Sponsor a Kitten form. */
export const DEFAULT_GIVEBUTTER_SPONSOR_EMBED = givingFormEmbed(DEFAULT_GIVEBUTTER_SPONSOR_CAMPAIGN);

/** Nine Lives Club recurring form. */
export const DEFAULT_GIVEBUTTER_NINE_LIVES_EMBED = givingFormEmbed(DEFAULT_GIVEBUTTER_NINE_LIVES_CAMPAIGN);

/** Platform query params (?p=) are not campaign codes. */
const PLATFORM_PARAMS = new Set(['other', 'godaddy', 'salesforce', 'unknown']);

function extractCampaignFromEmbed(code) {
  const campaignAttr = code.match(/campaign=["']([^"']+)["']/i);
  if (campaignAttr?.[1]) return campaignAttr[1];

  const widgetAttr = code.match(/<givebutter-widget[^>]*\bid=["']([^"']+)["']/i);
  if (widgetAttr?.[1]) return widgetAttr[1];

  const campaignParam = code.match(/[?&]campaign=([^&"'\s>]+)/i);
  if (campaignParam?.[1] && !PLATFORM_PARAMS.has(campaignParam[1].toLowerCase())) {
    return decodeURIComponent(campaignParam[1]);
  }

  return null;
}

function extractFormOrWidgetTag(embed) {
  const match = embed.match(/<givebutter-[a-z-]+[^>]*>[\s\S]*?<\/givebutter-[a-z-]+>|<givebutter-[a-z-]+[^>]*\/>/i);
  return match?.[0] || `<givebutter-giving-form campaign="${DEFAULT_GIVEBUTTER_DONATE_CAMPAIGN}"></givebutter-giving-form>`;
}

/** Ensure embed includes a visible Givebutter element, not just the library script. */
export function ensureGivebutterEmbed(code, fallbackEmbed = DEFAULT_GIVEBUTTER_EMBED) {
  const trimmed = code?.trim();
  if (!trimmed) return fallbackEmbed;

  if (/<givebutter-/i.test(trimmed)) return trimmed;

  const campaign = extractCampaignFromEmbed(trimmed);
  if (campaign) {
    return `${trimmed}\n<givebutter-giving-form campaign="${campaign}"></givebutter-giving-form>`;
  }

  // Script-only snippet (common when staff paste just the library tag) — keep their
  // script if present, but always attach a real form/widget from the default embed.
  if (/<script[\s>]/i.test(trimmed)) {
    return `${trimmed}\n${extractFormOrWidgetTag(fallbackEmbed)}`;
  }

  return fallbackEmbed;
}
