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
