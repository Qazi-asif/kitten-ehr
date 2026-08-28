export const WISHLIST_OWNER_TYPES = {
  ORG: 'ORG',
  FOSTER: 'FOSTER',
  KITTEN: 'KITTEN',
};

export const WISHLIST_RETAILERS = {
  AMAZON: 'AMAZON',
  CHEWY: 'CHEWY',
  WALMART: 'WALMART',
};

export const WISHLIST_RETAILER_OPTIONS = [
  { value: WISHLIST_RETAILERS.AMAZON, label: 'Amazon' },
  { value: WISHLIST_RETAILERS.CHEWY, label: 'Chewy' },
  { value: WISHLIST_RETAILERS.WALMART, label: 'Walmart' },
];

export const WISHLIST_RETAILER_META = {
  AMAZON: {
    label: 'Amazon Wishlist',
    description: 'Shop supplies for this kitten',
    buttonClass: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
  },
  WALMART: {
    label: 'Walmart Wishlist',
    description: 'Help with everyday essentials',
    buttonClass: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100',
  },
  CHEWY: {
    label: 'Chewy Wishlist',
    description: 'Food, formula, and pet supplies',
    buttonClass: 'border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100',
  },
};

export const ORG_SETTINGS_ID = 1;

export const DEFAULT_WISHLIST_GROUP_NAME = 'General Supplies';

/**
 * CR-109: collapses flat wishlist rows into named lists,
 * [{ name, links: [...] }], ordered by sortOrder then name.
 * Mirrors `groupWishlists` on the server so admin and public views agree.
 */
export function groupWishlists(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const name = row.groupName || DEFAULT_WISHLIST_GROUP_NAME;
    if (!groups.has(name)) {
      groups.set(name, { name, sortOrder: row.sortOrder ?? 0, links: [] });
    }
    const group = groups.get(name);
    group.sortOrder = Math.min(group.sortOrder, row.sortOrder ?? 0);
    group.links.push(row);
  }
  return [...groups.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
}
