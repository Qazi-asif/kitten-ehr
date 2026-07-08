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

export function formatKittenAgeDetailed(dateOfBirth) {
  if (!dateOfBirth) return 'Age Unknown';

  const dob = new Date(dateOfBirth);
  const now = new Date();
  const diffMs = now.getTime() - dob.getTime();

  if (Number.isNaN(dob.getTime()) || diffMs < 0) return 'Age Unknown';

  const totalWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  const months = Math.floor(totalWeeks / 4);
  const weeks = totalWeeks % 4;

  return `${weeks} weeks, ${months} months`;
}
