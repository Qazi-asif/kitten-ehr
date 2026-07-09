export function formatKittenAgeShort(dateOfBirth) {
  if (!dateOfBirth) return '—';
  const dob = new Date(dateOfBirth);
  const now = new Date();
  if (Number.isNaN(dob.getTime()) || dob > now) return '—';

  const totalWeeks = Math.floor((now.getTime() - dob.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (totalWeeks < 1) return '< 1 wk';
  if (totalWeeks < 52) return `${totalWeeks} wks`;
  const years = Math.floor(totalWeeks / 52);
  return years === 1 ? '1 yr' : `${years} yrs`;
}

export function formatKittenAgeDetailed(dateOfBirth) {
  if (!dateOfBirth) return 'Age Unknown';

  const dob = new Date(dateOfBirth);
  const now = new Date();
  if (Number.isNaN(dob.getTime()) || dob > now) return 'Age Unknown';

  const totalWeeks = Math.floor((now.getTime() - dob.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (totalWeeks < 1) return 'Less than 1 week';

  const months = Math.floor(totalWeeks / 4);
  const weeks = totalWeeks % 4;

  if (months === 0) {
    return `${totalWeeks} week${totalWeeks === 1 ? '' : 's'}`;
  }

  if (weeks === 0) {
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  return `${months} month${months === 1 ? '' : 's'}, ${weeks} week${weeks === 1 ? '' : 's'}`;
}
