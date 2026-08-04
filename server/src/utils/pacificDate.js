/**
 * Pacific timezone helpers for date-only and datetime fields.
 * Dates entered by staff must display as the same calendar day in America/Los_Angeles.
 */
const PACIFIC = 'America/Los_Angeles';

function pad(n) {
  return String(n).padStart(2, '0');
}

/** Format a Date (or ISO string) as YYYY-MM-DD in Pacific. */
export function toPacificDateString(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Format a Date as YYYY-MM-DDTHH:mm for datetime-local inputs (Pacific). */
export function toPacificDateTimeLocal(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  let hour = get('hour');
  if (hour === '24') hour = '00';
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Parse a date-only string (YYYY-MM-DD) as Pacific midnight → UTC Date.
 * Avoids the UTC-midnight rollback that shifts dates one day earlier.
 */
export function parsePacificDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }
  const raw = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, d] = match;
  const ymd = `${y}-${m}-${d}`;
  // Prefer the UTC hour whose Pacific wall time is exactly midnight.
  // Do NOT accept the first same-calendar-day hit: during PDT, 08:00Z is
  // 01:00 Pacific (still the same date) and would shift the day window by 1h.
  for (const hour of [7, 8, 9]) {
    const candidate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), hour, 0, 0));
    if (toPacificDateTimeLocal(candidate) === `${ymd}T00:00`) return candidate;
  }
  // Rare DST edge: accept any instant still labeled as that Pacific day.
  for (const hour of [7, 8, 9]) {
    const candidate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), hour, 0, 0));
    if (toPacificDateString(candidate) === ymd) return candidate;
  }
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 8, 0, 0));
}

/**
 * Parse datetime-local (YYYY-MM-DDTHH:mm) as Pacific wall time -> UTC Date.
 */
export function parsePacificDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(raw);
  if (!match) {
    const fallback = new Date(raw);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, d, hh, mm, ss = '00'] = match;
  // Binary-search UTC instant whose Pacific components match the wall time.
  const targetKey = `${y}-${m}-${d} ${hh}:${mm}`;
  let lo = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) + 5, Number(mm), Number(ss || 0));
  let hi = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) + 10, Number(mm), Number(ss || 0));
  for (let i = 0; i < 40; i += 1) {
    const mid = Math.floor((lo + hi) / 2);
    const labeled = toPacificDateTimeLocal(new Date(mid)).replace('T', ' ');
    if (labeled === targetKey) return new Date(mid);
    if (labeled < targetKey) lo = mid + 1;
    else hi = mid - 1;
  }
  // Fallback: construct via locale offset approximation
  const approx = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss || '00'}`);
  return Number.isNaN(approx.getTime()) ? null : approx;
}

export function formatPacificDisplay(value, { withTime = false } = {}) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  if (withTime) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: PACIFIC,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** UTC Date for midnight at the start of the current Pacific calendar day. */
export function startOfPacificTodayUtc() {
  return parsePacificDateOnly(toPacificDateString(new Date()));
}

/**
 * UTC Date for Pacific midnight of (value's Pacific calendar day + days).
 * `days` may be negative. Safe across DST transitions since it re-derives
 * the target UTC instant from the shifted Y-M-D via parsePacificDateOnly,
 * rather than doing raw millisecond arithmetic on the anchor instant.
 */
export function addPacificDays(value, days) {
  const ymd = toPacificDateString(value instanceof Date ? value : new Date(value));
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  // Date.UTC normalizes day overflow/underflow (e.g. day 32 -> next month).
  const shifted = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const shiftedYmd = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
  return parsePacificDateOnly(shiftedYmd);
}

/** UTC Date for the last instant (23:59:59.999) of value's Pacific calendar day. */
export function endOfPacificDayUtc(value) {
  const nextDayStart = addPacificDays(value, 1);
  if (!nextDayStart) return null;
  return new Date(nextDayStart.getTime() - 1);
}

export { PACIFIC, pad };
