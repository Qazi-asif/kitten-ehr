export function formatKittenAgeShort(dateOfBirth) {
  if (!dateOfBirth) return '—';
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const weeks = Math.floor((now - dob) / (7 * 24 * 60 * 60 * 1000));
  if (weeks < 1) return '< 1 wk';
  if (weeks < 52) return `${weeks} wks`;
  const years = Math.floor(weeks / 52);
  return years === 1 ? '1 yr' : `${years} yrs`;
}
