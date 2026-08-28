/**
 * Pacific timezone helpers for date-only and datetime fields.
 * Dates entered by staff must display as the same calendar day in America/Los_Angeles.
 */
const PACIFIC = 'America/Los_Angeles';

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Resolve any accepted input to an instant. Strings never reach `new Date()`
 * directly: an un-zoned string is a Pacific wall-clock reading, so it is routed
 * through the Pacific parsers instead of the host timezone.
 */
function toInstant(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  return parsePacificDateTime(value);
}

/** Format a Date (or ISO string) as YYYY-MM-DD in Pacific. */
export function toPacificDateString(value) {
  const date = toInstant(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PACIFIC,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Format a Date as YYYY-MM-DDTHH:mm for datetime-local inputs (Pacific). */
export function toPacificDateTimeLocal(value) {
  const date = toInstant(value);
  if (!date) return '';
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
 * A string carrying `Z` or a `±HH:MM` offset names an unambiguous instant, so
 * `new Date()` is safe on it. A string without one is a wall-clock reading and
 * MUST be interpreted as Pacific — never with `new Date()`, which would resolve
 * it against the server process timezone (UTC in production).
 */
const TZ_DESIGNATOR = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * Pacific's UTC offset in milliseconds at a given instant (negative: -7h under
 * PDT, -8h under PST). Derived from the formatter rather than hardcoded, so DST
 * rule changes are picked up automatically.
 */
function pacificOffsetMs(instant) {
  const minuteAligned = Math.floor(Number(instant) / 60000) * 60000;
  const wall = toPacificDateTimeLocal(new Date(minuteAligned));
  return Date.parse(`${wall}:00Z`) - minuteAligned;
}

/** UTC instant whose Pacific wall time is exactly midnight on the given Y-M-D. */
function pacificMidnightUtc(y, m, d) {
  const ymd = `${pad(y)}-${pad(m)}-${pad(d)}`;
  // Do NOT accept the first same-calendar-day hit: during PDT, 08:00Z is
  // 01:00 Pacific (still the same date) and would shift the day window by 1h.
  for (const hour of [7, 8, 9]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
    if (toPacificDateTimeLocal(candidate) === `${ymd}T00:00`) return candidate;
  }
  // Rare DST edge: accept any instant still labeled as that Pacific day.
  for (const hour of [7, 8, 9]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
    if (toPacificDateString(candidate) === ymd) return candidate;
  }
  return new Date(Date.UTC(y, m - 1, d, 8, 0, 0));
}

/**
 * Parse a calendar day as Pacific midnight → UTC Date.
 *
 * Accepts `YYYY-MM-DD`, a time-bearing string (the time is discarded), or an
 * instant. Anything time-bearing is reduced to its Pacific calendar day, so
 * passing a datetime here yields the correct DAY rather than a host-timezone
 * misparse. Returns null when no calendar day can be determined.
 */
export function parsePacificDateOnly(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }

  const raw = String(value).trim();

  const dateOnly = DATE_ONLY.exec(raw);
  if (dateOnly) {
    return pacificMidnightUtc(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
  }

  // Un-zoned wall-clock string: keep the calendar day exactly as typed.
  const dateTime = DATE_TIME.exec(raw);
  if (dateTime && !TZ_DESIGNATOR.test(raw)) {
    return pacificMidnightUtc(Number(dateTime[1]), Number(dateTime[2]), Number(dateTime[3]));
  }

  // Zoned or otherwise absolute: resolve the instant, then take its Pacific day.
  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return null;
  const ymd = toPacificDateString(instant);
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return pacificMidnightUtc(y, m, d);
}

/**
 * Parse a moment in time → UTC Date.
 *
 * Un-zoned strings (`YYYY-MM-DDTHH:mm`, as produced by `datetime-local` inputs)
 * are read as Pacific wall time. Zoned strings are taken at face value. A bare
 * calendar day resolves to Pacific midnight. Returns null on unparseable input
 * rather than guessing against the server timezone.
 */
export function parsePacificDateTime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();

  if (TZ_DESIGNATOR.test(raw)) {
    const instant = new Date(raw);
    return Number.isNaN(instant.getTime()) ? null : instant;
  }

  const match = DATE_TIME.exec(raw);
  if (!match) return parsePacificDateOnly(raw);

  const [, y, m, d, hh, mm, ss = '00'] = match;

  // Treat the wall-clock reading as if it were UTC, then subtract Pacific's
  // offset at that moment. Two passes settle the case where the offset differs
  // between the guess and the result (i.e. a DST boundary).
  const wallAsUtc = Date.UTC(
    Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0),
  );
  let instant = wallAsUtc - pacificOffsetMs(wallAsUtc);
  instant = wallAsUtc - pacificOffsetMs(instant);
  return new Date(instant);
}

export function formatPacificDisplay(value, { withTime = false } = {}) {
  const date = toInstant(value);
  if (!date) return '';
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
  const ymd = toPacificDateString(value instanceof Date ? value : parsePacificDateOnly(value));
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
