/**
 * Regression tests for the Pacific date handling that broke across CR-52,
 * CR-53, CR-68, CR-83 and CR-103.
 *
 * Run with an explicit TZ to prove host-independence:
 *   TZ=UTC                node --test tests/
 *   TZ=America/Los_Angeles node --test tests/
 *   TZ=Asia/Karachi       node --test tests/
 *
 * The Karachi case matters: it is UTC+5, so a host-timezone-dependent parse
 * fails there in the opposite direction from production. Several past fixes
 * were verified on a machine whose timezone masked the bug.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatPacificDisplay,
  parsePacificDateOnly,
  parsePacificDateTime,
  toPacificDateString,
  toPacificDateTimeLocal,
  addPacificDays,
  endOfPacificDayUtc,
} from '../src/utils/pacificDate.js';
import { normalizeDateField } from '../src/utils/dateFields.js';

describe('parsePacificDateOnly', () => {
  it('anchors a calendar day to Pacific midnight, not UTC midnight', () => {
    const parsed = parsePacificDateOnly('2026-08-28');
    assert.equal(toPacificDateTimeLocal(parsed), '2026-08-28T00:00');
    assert.equal(parsed.toISOString(), '2026-08-28T07:00:00.000Z'); // PDT = UTC-7
  });

  it('handles a PST (winter) day at UTC-8', () => {
    const parsed = parsePacificDateOnly('2026-01-15');
    assert.equal(toPacificDateTimeLocal(parsed), '2026-01-15T00:00');
    assert.equal(parsed.toISOString(), '2026-01-15T08:00:00.000Z');
  });

  it('discards the time from a datetime string instead of misparsing it', () => {
    // The CR-103 regression: this used to fall through to new Date(raw),
    // which resolved against the server timezone.
    const parsed = parsePacificDateOnly('2026-08-28T14:30');
    assert.equal(toPacificDateString(parsed), '2026-08-28');
  });

  it('keeps the typed day for an early-morning time that would roll back', () => {
    const parsed = parsePacificDateOnly('2026-08-28T00:30');
    assert.equal(toPacificDateString(parsed), '2026-08-28');
  });

  it('resolves a zoned instant to its Pacific calendar day', () => {
    // 06:00Z on the 29th is still the 28th in Pacific.
    const parsed = parsePacificDateOnly('2026-08-29T06:00:00.000Z');
    assert.equal(toPacificDateString(parsed), '2026-08-28');
  });

  it('returns null rather than guessing on unparseable input', () => {
    assert.equal(parsePacificDateOnly('not a date'), null);
    assert.equal(parsePacificDateOnly(''), null);
    assert.equal(parsePacificDateOnly(null), null);
  });
});

describe('parsePacificDateTime', () => {
  it('reads an un-zoned wall time as Pacific, not as server-local', () => {
    // This is the exact CR-103 failure. Under TZ=UTC the old code produced
    // 14:30Z, which displayed as 07:30 Pacific -- the reported 7 hour shift.
    const parsed = parsePacificDateTime('2026-08-28T14:30');
    assert.equal(parsed.toISOString(), '2026-08-28T21:30:00.000Z');
    assert.equal(toPacificDateTimeLocal(parsed), '2026-08-28T14:30');
  });

  it('does not roll the date back for a pre-dawn entry', () => {
    const parsed = parsePacificDateTime('2026-08-28T00:15');
    assert.equal(toPacificDateString(parsed), '2026-08-28');
  });

  it('respects an explicit timezone designator', () => {
    const parsed = parsePacificDateTime('2026-08-28T21:30:00.000Z');
    assert.equal(parsed.toISOString(), '2026-08-28T21:30:00.000Z');
  });

  it('falls back to Pacific midnight for a bare calendar day', () => {
    const parsed = parsePacificDateTime('2026-08-28');
    assert.equal(toPacificDateTimeLocal(parsed), '2026-08-28T00:00');
  });

  it('resolves the spring-forward gap deterministically', () => {
    // 2026-03-08 02:30 Pacific does not exist; must not throw or return null.
    const parsed = parsePacificDateTime('2026-03-08T02:30');
    assert.ok(parsed instanceof Date);
    assert.ok(!Number.isNaN(parsed.getTime()));
  });

  it('handles the fall-back duplicate hour', () => {
    const parsed = parsePacificDateTime('2026-11-01T01:30');
    assert.ok(parsed instanceof Date);
    assert.equal(toPacificDateString(parsed), '2026-11-01');
  });
});

describe('round trip: what staff type is what staff see', () => {
  const timestamps = ['2026-08-28T14:30', '2026-08-28T00:15', '2026-01-15T23:45', '2026-12-31T18:00'];

  for (const entered of timestamps) {
    it(`preserves ${entered} through store and display`, () => {
      const stored = normalizeDateField('WeightLog.date', entered);
      assert.equal(toPacificDateTimeLocal(stored), entered);
    });
  }

  const days = ['2026-08-28', '2026-01-01', '2026-12-31', '2026-03-08', '2026-11-01'];

  for (const entered of days) {
    it(`preserves the calendar day ${entered} through store and display`, () => {
      const stored = normalizeDateField('Vaccine.dateGiven', entered);
      assert.equal(toPacificDateString(stored), entered);
    });
  }
});

describe('normalizeDateField', () => {
  it('routes weight entries as timestamps', () => {
    const stored = normalizeDateField('WeightLog.date', '2026-08-28T14:30');
    assert.equal(stored.toISOString(), '2026-08-28T21:30:00.000Z');
  });

  it('routes vaccine dates as calendar days', () => {
    const stored = normalizeDateField('Vaccine.dateGiven', '2026-08-28');
    assert.equal(stored.toISOString(), '2026-08-28T07:00:00.000Z');
  });

  it('returns null for empty input so nullable columns can be cleared', () => {
    assert.equal(normalizeDateField('Vaccine.nextDueDate', ''), null);
    assert.equal(normalizeDateField('Vaccine.nextDueDate', null), null);
  });

  it('refuses an unregistered field instead of picking a convention', () => {
    assert.throws(
      () => normalizeDateField('Kitten.someNewDate', '2026-08-28'),
      /unregistered date field/,
    );
  });
});

describe('day-window helpers', () => {
  it('spans a full Pacific day', () => {
    const start = parsePacificDateOnly('2026-08-28');
    const end = endOfPacificDayUtc(start);
    assert.equal(toPacificDateString(start), '2026-08-28');
    assert.equal(toPacificDateString(end), '2026-08-28');
    assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000 - 1);
  });

  it('crosses the spring-forward boundary without drifting', () => {
    const start = parsePacificDateOnly('2026-03-07');
    assert.equal(toPacificDateString(addPacificDays(start, 1)), '2026-03-08');
    assert.equal(toPacificDateString(addPacificDays(start, 2)), '2026-03-09');
  });

  it('crosses the fall-back boundary without drifting', () => {
    const start = parsePacificDateOnly('2026-10-31');
    assert.equal(toPacificDateString(addPacificDays(start, 1)), '2026-11-01');
    assert.equal(toPacificDateString(addPacificDays(start, 2)), '2026-11-02');
  });
});

describe('day-window helpers accept strings and Dates interchangeably', () => {
  // A date-only string used to go through new Date(), which reads it as UTC
  // midnight -- the PREVIOUS Pacific day. endOfPacificDayUtc then returned an
  // instant before the day had even started.
  const days = ['2026-08-28', '2026-01-15', '2026-03-08', '2026-11-01'];

  for (const day of days) {
    it(`treats "${day}" the same as its Date equivalent`, () => {
      const asDate = parsePacificDateOnly(day);
      assert.equal(addPacificDays(day, 1).getTime(), addPacificDays(asDate, 1).getTime());
      assert.equal(addPacificDays(day, -1).getTime(), addPacificDays(asDate, -1).getTime());
      assert.equal(endOfPacificDayUtc(day).getTime(), endOfPacificDayUtc(asDate).getTime());
    });
  }

  it('ends the day after it starts, for string input', () => {
    const start = parsePacificDateOnly('2026-08-28');
    const end = endOfPacificDayUtc('2026-08-28');
    assert.ok(end.getTime() > start.getTime());
    assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000 - 1);
    assert.equal(toPacificDateString(end), '2026-08-28');
  });

  it('advances a string by a day across spring forward', () => {
    // 2026-03-08 is a 23 hour Pacific day.
    assert.equal(toPacificDateString(addPacificDays('2026-03-07', 1)), '2026-03-08');
    assert.equal(toPacificDateString(addPacificDays('2026-03-08', 1)), '2026-03-09');
    const end = endOfPacificDayUtc('2026-03-08');
    const start = parsePacificDateOnly('2026-03-08');
    assert.equal(end.getTime() - start.getTime(), 23 * 60 * 60 * 1000 - 1);
    assert.equal(toPacificDateString(end), '2026-03-08');
  });

  it('advances a string by a day across fall back', () => {
    // 2026-11-01 is a 25 hour Pacific day.
    const end = endOfPacificDayUtc('2026-11-01');
    const start = parsePacificDateOnly('2026-11-01');
    assert.equal(end.getTime() - start.getTime(), 25 * 60 * 60 * 1000 - 1);
    assert.equal(toPacificDateString(end), '2026-11-01');
  });
});

describe('formatPacificDisplay', () => {
  it('renders in Pacific regardless of host timezone', () => {
    const instant = new Date('2026-08-28T21:30:00.000Z');
    assert.equal(formatPacificDisplay(instant), 'Aug 28, 2026');
    assert.equal(formatPacificDisplay(instant, { withTime: true }), 'Aug 28, 2026, 2:30 PM');
  });

  it('shows the Pacific day for a late-UTC instant', () => {
    // 03:00Z on the 29th is 8pm on the 28th in Pacific.
    const instant = new Date('2026-08-29T03:00:00.000Z');
    assert.equal(formatPacificDisplay(instant), 'Aug 28, 2026');
  });
});
