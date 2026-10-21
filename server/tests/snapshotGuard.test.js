import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateSnapshotGuard, nextBackoffMinutes, outboxDisposition } from '../src/services/snapshotGuard.js';

describe('evaluateSnapshotGuard', () => {
  it('blocks an empty snapshot without override', () => {
    const result = evaluateSnapshotGuard({ rowCount: 0, lastSuccessfulCount: 12 });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'empty');
  });

  it('blocks a more-than-50% shrink without override', () => {
    const result = evaluateSnapshotGuard({ rowCount: 4, lastSuccessfulCount: 10 });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'shrink');
  });

  it('allows empty or shrink when override is true', () => {
    assert.equal(evaluateSnapshotGuard({ rowCount: 0, lastSuccessfulCount: 8, override: true }).ok, true);
    assert.equal(evaluateSnapshotGuard({ rowCount: 2, lastSuccessfulCount: 10, override: true }).ok, true);
  });

  it('allows a first snapshot and a modest change', () => {
    assert.equal(evaluateSnapshotGuard({ rowCount: 3, lastSuccessfulCount: 0 }).ok, true);
    assert.equal(evaluateSnapshotGuard({ rowCount: 8, lastSuccessfulCount: 10 }).ok, true);
  });
});

describe('outboxDisposition', () => {
  it('does not mark guard-blocked runs as processed', () => {
    assert.equal(outboxDisposition({ ok: true }), 'processed');
    assert.equal(outboxDisposition({ ok: false, blocked: true }), 'retry_guard');
    assert.equal(outboxDisposition({ ok: false, error: 'ftp failed' }), 'backoff');
  });
});

describe('nextBackoffMinutes', () => {
  it('uses 1, 2, 4, 8 and caps at 30 minutes', () => {
    assert.equal(nextBackoffMinutes(1), 1);
    assert.equal(nextBackoffMinutes(2), 2);
    assert.equal(nextBackoffMinutes(3), 4);
    assert.equal(nextBackoffMinutes(4), 8);
    assert.equal(nextBackoffMinutes(5), 16);
    assert.equal(nextBackoffMinutes(6), 30);
    assert.equal(nextBackoffMinutes(20), 30);
  });
});
