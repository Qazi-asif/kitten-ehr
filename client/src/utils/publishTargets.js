export const PUBLISH_PLATFORM_IDS = ['WEBSITE', 'FACEBOOK', 'INSTAGRAM', 'X', 'TIKTOK'];

export const PUBLISH_PLATFORMS = [
  {
    id: 'WEBSITE',
    label: 'Website',
    shortLabel: 'Web',
    description: 'Public adoption site & pages',
    ring: 'ring-slate-200',
    activeRing: 'ring-slate-500',
    bg: 'bg-slate-50',
    activeBg: 'bg-slate-900',
    text: 'text-slate-700',
    activeText: 'text-white',
    dot: 'bg-slate-500',
  },
  {
    id: 'FACEBOOK',
    label: 'Facebook',
    shortLabel: 'FB',
    description: 'Facebook page & groups',
    ring: 'ring-blue-200',
    activeRing: 'ring-blue-600',
    bg: 'bg-blue-50',
    activeBg: 'bg-blue-600',
    text: 'text-blue-800',
    activeText: 'text-white',
    dot: 'bg-blue-600',
  },
  {
    id: 'INSTAGRAM',
    label: 'Instagram',
    shortLabel: 'IG',
    description: 'Instagram feed & stories',
    ring: 'ring-pink-200',
    activeRing: 'ring-pink-600',
    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
    activeBg: 'bg-gradient-to-br from-purple-600 to-pink-600',
    text: 'text-pink-800',
    activeText: 'text-white',
    dot: 'bg-pink-600',
  },
  {
    id: 'X',
    label: 'X (Twitter)',
    shortLabel: 'X',
    description: 'Posts on X / Twitter',
    ring: 'ring-gray-200',
    activeRing: 'ring-gray-900',
    bg: 'bg-gray-50',
    activeBg: 'bg-gray-900',
    text: 'text-gray-800',
    activeText: 'text-white',
    dot: 'bg-gray-900',
  },
  {
    id: 'TIKTOK',
    label: 'TikTok',
    shortLabel: 'TT',
    description: 'TikTok videos & updates',
    ring: 'ring-cyan-200',
    activeRing: 'ring-cyan-600',
    bg: 'bg-cyan-50',
    activeBg: 'bg-cyan-600',
    text: 'text-cyan-900',
    activeText: 'text-white',
    dot: 'bg-cyan-600',
  },
];

const LEGACY_PLATFORM_MAP = {
  Facebook: 'FACEBOOK',
  Instagram: 'INSTAGRAM',
  'X (Twitter)': 'X',
  Twitter: 'X',
  TikTok: 'TIKTOK',
  Website: 'WEBSITE',
};

export function normalizePublishTargets(targets) {
  if (!Array.isArray(targets)) return [];
  return PUBLISH_PLATFORM_IDS.filter((id) => targets.includes(id));
}

export function resolvePublishTargets(record) {
  if (record?.publishTargets?.length) {
    return normalizePublishTargets(record.publishTargets);
  }
  if (record?.isListedOnWebsite || record?.isPublic) {
    return ['WEBSITE'];
  }
  return [];
}

export function getPublishPlatformLabel(id) {
  return PUBLISH_PLATFORMS.find((platform) => platform.id === id)?.label || id;
}

export function resolveUpdateTargets(entry) {
  if (entry?.publishTargets?.length) {
    return normalizePublishTargets(entry.publishTargets);
  }
  if (!entry?.platformList) return [];
  return entry.platformList
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => LEGACY_PLATFORM_MAP[value] || value.toUpperCase())
    .filter((id) => PUBLISH_PLATFORM_IDS.includes(id));
}

export function parseSocialDeliveryLog(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getDeliveryStatusLabel(status) {
  if (status === 'posted') return 'Posted';
  if (status === 'manual') return 'Share manually';
  if (status === 'failed') return 'Failed';
  return 'Skipped';
}
