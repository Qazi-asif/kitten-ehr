import { resolveSponsorTier } from '../constants/donationCopy.js';

const SPONSOR_TIERS = [
  { name: 'Kickstart Kitty', price: 15 },
  { name: 'Shots & Chips', price: 40 },
  { name: 'Belly & Box', price: 75 },
  { name: 'The Big Fix', price: 135 },
  { name: 'Whole Kitten Caboodle', price: 350 },
];

function parseUtmParameters(value) {
  if (!value) return new URLSearchParams();
  if (typeof value === 'object' && !Array.isArray(value)) {
    const params = new URLSearchParams();
    Object.entries(value).forEach(([key, entry]) => {
      if (entry != null) params.set(key, String(entry));
    });
    return params;
  }
  const text = String(value).trim();
  if (!text) return new URLSearchParams();
  if (text.startsWith('{')) {
    try {
      return parseUtmParameters(JSON.parse(text));
    } catch {
      return new URLSearchParams();
    }
  }
  return new URLSearchParams(text.startsWith('?') ? text.slice(1) : text);
}

function readCustomFieldValue(customFields, keys) {
  if (!Array.isArray(customFields)) return '';
  const normalizedKeys = keys.map((key) => key.toLowerCase());
  const match = customFields.find((field) => {
    const title = String(field?.title || field?.label || '').toLowerCase();
    return normalizedKeys.some((key) => title.includes(key));
  });
  return match?.value ? String(match.value).trim() : '';
}

function normalizeTransactionPayload(payload = {}) {
  const root = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  const nested = Array.isArray(root.transactions) && root.transactions.length > 0
    ? root.transactions[0]
    : root;

  const amount = Number(nested.amount ?? root.amount);
  const externalId = String(nested.id || root.id || '').trim();

  return {
    externalId,
    amount: Number.isFinite(amount) ? amount : 0,
    email: String(nested.email || root.email || '').trim(),
    firstName: String(nested.first_name || root.first_name || '').trim(),
    lastName: String(nested.last_name || root.last_name || '').trim(),
    customFields: nested.custom_fields || root.custom_fields || [],
    utmParameters: nested.utm_parameters || root.utm_parameters || '',
    transactedAt: nested.transacted_at || root.transacted_at || nested.captured_at || root.captured_at,
    dedicationName: nested.dedication?.name || root.dedication?.name || '',
  };
}

function resolveKittenContext(txn) {
  const utm = parseUtmParameters(txn.utmParameters);
  const kittenIdRaw = utm.get('kitten_id') || utm.get('kittenId');
  const kittenId = kittenIdRaw ? Number.parseInt(kittenIdRaw, 10) : null;
  const kittenName = (
    utm.get('kitten_name')
    || utm.get('kitten')
    || readCustomFieldValue(txn.customFields, ['kitten', 'sponsor'])
    || txn.dedicationName
    || ''
  ).trim();

  const isSponsorship = Boolean(
    utm.get('sponsor')
    || utm.get('sponsorship')
    || kittenName
    || (Number.isInteger(kittenId) && kittenId > 0),
  );

  return {
    kittenId: Number.isInteger(kittenId) && kittenId > 0 ? kittenId : null,
    kittenName,
    isSponsorship,
    tier: utm.get('tier') || resolveSponsorTier(txn.amount),
  };
}

function verifyGivebutterWebhook(req) {
  const secret = process.env.GIVEBUTTER_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const signature = (
    req.get('x-givebutter-signature')
    || req.get('x-webhook-signature')
    || req.get('givebutter-signature')
    || ''
  ).trim();

  return signature === secret;
}

export {
  normalizeTransactionPayload,
  parseUtmParameters,
  resolveKittenContext,
  verifyGivebutterWebhook,
};
