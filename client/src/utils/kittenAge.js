/**
 * Single shared age helper — used EVERYWHERE a kitten's age is computed or
 * displayed (public profile, PublicKittenCard, admin list, admin detail).
 * Backend `dateOfBirth` is the source of truth; every caller must route
 * through this file rather than computing age locally (CR-92).
 *
 * Display rule (CR-92):
 *  - Under 3 months old: WEEKS only (e.g. "6 weeks") — never months.
 *  - 3+ months old: months (and years when appropriate).
 *
 * Dates are anchored to the *Pacific* calendar day, not the viewer's
 * browser/OS timezone, so "today" and DOB comparisons stay correct
 * regardless of where staff are physically located.
 */
import { toPacificDateString } from './pacificDate';

const MONTHS_WEEKS_CUTOFF = 3;

function parseCalendarDate(value) {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const date = new Date(Date.UTC(year, month, day));
      if (
        Number.isNaN(date.getTime())
        || date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month
        || date.getUTCDate() !== day
      ) {
        return null;
      }
      return date;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const ymd = toPacificDateString(date);
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function todayCalendar() {
  const ymd = toPacificDateString(new Date());
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Whole calendar months between DOB and today (day-aware). */
export function getKittenAgeMonths(dateOfBirth) {
  const dob = parseCalendarDate(dateOfBirth);
  if (!dob) return null;
  const today = todayCalendar();
  if (dob > today) return null;

  let months = (today.getUTCFullYear() - dob.getUTCFullYear()) * 12 + (today.getUTCMonth() - dob.getUTCMonth());
  if (today.getUTCDate() < dob.getUTCDate()) months -= 1;
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

  if (months < MONTHS_WEEKS_CUTOFF) {
    return weeks === 1 ? '1 wk' : `${weeks} wks`;
  }

  if (months < 12) {
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

  if (months < MONTHS_WEEKS_CUTOFF) {
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }

  if (months < 12) {
    const wholeMonths = months;
    const dob = parseCalendarDate(dateOfBirth);
    const approx = new Date(Date.UTC(dob.getUTCFullYear(), dob.getUTCMonth() + wholeMonths, dob.getUTCDate()));
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
