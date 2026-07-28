/**
 * Age helpers that avoid UTC date-only parsing bugs.
 * `YYYY-MM-DD` must be treated as a calendar date, not UTC midnight.
 */

function parseCalendarDate(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const date = new Date(year, month, day);
      if (
        Number.isNaN(date.getTime())
        || date.getFullYear() !== year
        || date.getMonth() !== month
        || date.getDate() !== day
      ) {
        return null;
      }
      return date;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayCalendar() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole calendar months between DOB and today (day-aware). */
export function getKittenAgeMonths(dateOfBirth) {
  const dob = parseCalendarDate(dateOfBirth);
  if (!dob) return null;
  const today = todayCalendar();
  if (dob > today) return null;

  let months = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
  if (today.getDate() < dob.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Whole weeks between DOB and today. */
export function getKittenAgeWeeks(dateOfBirth) {
  const dob = parseCalendarDate(dateOfBirth);
  if (!dob) return null;
  const today = todayCalendar();
  if (dob > today) return null;
  const ms = today.getTime() - dob.getTime();
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

export function formatKittenAgeShort(dateOfBirth) {
  const weeks = getKittenAgeWeeks(dateOfBirth);
  if (weeks == null) return '—';
  if (weeks < 1) return '< 1 wk';

  const months = getKittenAgeMonths(dateOfBirth);
  if (months == null) return '—';

  if (months < 12) {
    if (months < 1) return weeks === 1 ? '1 wk' : `${weeks} wks`;
    return months === 1 ? '1 mo' : `${months} mos`;
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return years === 1 ? '1 yr' : `${years} yrs`;
  if (years === 1) return `1 yr ${remMonths} mo${remMonths === 1 ? '' : 's'}`;
  return `${years} yrs ${remMonths} mo${remMonths === 1 ? '' : 's'}`;
}

export function formatKittenAgeDetailed(dateOfBirth) {
  const weeks = getKittenAgeWeeks(dateOfBirth);
  if (weeks == null) return 'Age Unknown';
  if (weeks < 1) return 'Less than 1 week';

  const months = getKittenAgeMonths(dateOfBirth);
  if (months == null) return 'Age Unknown';

  // Under ~2 months: prefer weeks (more useful for neonates).
  if (months < 2) {
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }

  if (months < 12) {
    const wholeMonths = months;
    const dob = parseCalendarDate(dateOfBirth);
    const approx = new Date(dob);
    approx.setMonth(approx.getMonth() + wholeMonths);
    const remWeeks = Math.max(
      0,
      Math.floor((todayCalendar().getTime() - approx.getTime()) / (7 * 24 * 60 * 60 * 1000)),
    );
    if (remWeeks === 0) {
      return `${wholeMonths} month${wholeMonths === 1 ? '' : 's'}`;
    }
    return `${wholeMonths} month${wholeMonths === 1 ? '' : 's'}, ${remWeeks} week${remWeeks === 1 ? '' : 's'}`;
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) {
    return `${years} year${years === 1 ? '' : 's'}`;
  }
  return `${years} year${years === 1 ? '' : 's'}, ${remMonths} month${remMonths === 1 ? '' : 's'}`;
}
