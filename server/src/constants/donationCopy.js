export const SPONSOR_TIERS = [
  { name: 'Kickstart Kitty', price: 15 },
  { name: 'Shots & Chips', price: 40 },
  { name: 'Belly & Box', price: 75 },
  { name: 'The Big Fix', price: 135 },
  { name: 'Whole Kitten Caboodle', price: 350 },
];

export function resolveSponsorTier(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return 'Custom';
  const match = SPONSOR_TIERS.find((tier) => tier.price === numeric);
  return match?.name || 'Custom';
}

export function sponsorshipOverflowDisclosure(kittenName) {
  return `Sponsorships help cover ${kittenName}'s care. Once ${kittenName} is fully funded or finds a home, additional gifts support kittens just like them. Pawsitive Transformations directs all sponsorship funds where the cats need them most.`;
}
