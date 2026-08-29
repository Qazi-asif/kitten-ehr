/**
 * Tests for the scheduled-publishing policy and the cron endpoint guard.
 *
 * These import only prisma-free modules on purpose: this suite must never open a
 * database connection or come anywhere near a real Graph API call, because the
 * database is shared with production and the social accounts are the live
 * rescue's. The database-level claim itself is exercised by
 * scripts/qa-social-scheduler.mjs, which uses disposable rows and a stub
 * publisher.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_INTERVAL_MS,
  MAX_ATTEMPTS,
  MAX_OVERDUE_MS,
  MIN_INTERVAL_MS,
  isTooOverdue,
  resolveIntervalConfig,
  splitPlatforms,
  statusAfterFailedAttempt,
} from '../src/services/socialPostSchedulerPolicy.js';
import { requireCronSecret } from '../src/middleware/cronAuth.js';

describe('retry policy', () => {
  it('returns a post to SCHEDULED while attempts remain', () => {
    assert.equal(statusAfterFailedAttempt(1), 'SCHEDULED');
    assert.equal(statusAfterFailedAttempt(MAX_ATTEMPTS - 1), 'SCHEDULED');
  });

  it('gives up with FAILED once the attempt budget is spent', () => {
    assert.equal(statusAfterFailedAttempt(MAX_ATTEMPTS), 'FAILED');
    assert.equal(statusAfterFailedAttempt(MAX_ATTEMPTS + 5), 'FAILED');
  });
});

describe('look-back window', () => {
  const now = new Date('2026-08-29T18:00:00Z');

  it('publishes a post that just came due', () => {
    assert.equal(isTooOverdue(new Date(now.getTime() - 60_000), now), false);
  });

  it('publishes a post inside the window', () => {
    assert.equal(isTooOverdue(new Date(now.getTime() - MAX_OVERDUE_MS + 60_000), now), false);
  });

  it('refuses a post older than the window, so a backlog is never blasted out', () => {
    assert.equal(isTooOverdue(new Date(now.getTime() - MAX_OVERDUE_MS - 1000), now), true);
    assert.equal(isTooOverdue(new Date('2026-08-01T00:00:00Z'), now), true);
  });

  it('treats a missing scheduled time as not overdue rather than throwing', () => {
    assert.equal(isTooOverdue(null, now), false);
  });
});

describe('platform split', () => {
  it('keeps Facebook/Instagram as targets and reports X/TikTok separately', () => {
    const { targets, unsupported } = splitPlatforms(['FACEBOOK', 'X', 'INSTAGRAM', 'TIKTOK']);
    assert.deepEqual(targets, ['FACEBOOK', 'INSTAGRAM']);
    assert.deepEqual(unsupported, ['X', 'TIKTOK']);
  });

  it('yields no targets for an X/TikTok-only post instead of failing the run', () => {
    const { targets, unsupported } = splitPlatforms(['X', 'TIKTOK']);
    assert.deepEqual(targets, []);
    assert.deepEqual(unsupported, ['X', 'TIKTOK']);
  });

  it('tolerates a missing platforms array', () => {
    assert.deepEqual(splitPlatforms(undefined), { targets: [], unsupported: [] });
  });
});

describe('in-process interval gate', () => {
  it('is on by default with no env at all, since Hostinger runs a persistent process', () => {
    assert.deepEqual(
      resolveIntervalConfig({}),
      { enabled: true, intervalMs: DEFAULT_INTERVAL_MS },
    );
  });

  it('falls back to the default interval for a zero or junk override', () => {
    assert.equal(
      resolveIntervalConfig({ SOCIAL_SCHEDULER_INTERVAL_MS: '0' }).intervalMs,
      DEFAULT_INTERVAL_MS,
    );
    assert.equal(
      resolveIntervalConfig({ SOCIAL_SCHEDULER_INTERVAL_MS: 'soon' }).intervalMs,
      DEFAULT_INTERVAL_MS,
    );
  });

  it('can be turned off explicitly', () => {
    for (const value of ['false', '0', 'off', 'NO']) {
      assert.deepEqual(
        resolveIntervalConfig({ SOCIAL_SCHEDULER_ENABLED: value }),
        { enabled: false, reason: 'disabled_by_env' },
        `expected ${value} to disable the runner`,
      );
    }
    assert.equal(resolveIntervalConfig({ SOCIAL_SCHEDULER_ENABLED: 'true' }).enabled, true);
  });

  it('still refuses to run on a serverless host, where the process is not long-lived', () => {
    assert.deepEqual(
      resolveIntervalConfig({ VERCEL: '1' }),
      { enabled: false, reason: 'vercel_uses_cron' },
    );
  });

  it('honours an interval override and floors it', () => {
    assert.deepEqual(
      resolveIntervalConfig({ SOCIAL_SCHEDULER_INTERVAL_MS: '300000' }),
      { enabled: true, intervalMs: 300000 },
    );
    assert.equal(
      resolveIntervalConfig({ SOCIAL_SCHEDULER_INTERVAL_MS: '500' }).intervalMs,
      MIN_INTERVAL_MS,
    );
  });
});

function fakeReq(headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (name) => lower[name.toLowerCase()] };
}

function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('cron endpoint guard', () => {
  function withSecret(secret, fn) {
    const previous = process.env.CRON_SECRET;
    if (secret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = secret;
    try {
      fn();
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  }

  it('refuses to run at all when CRON_SECRET is unset, rather than standing open', () => {
    withSecret(undefined, () => {
      const res = fakeRes();
      let nextCalled = false;
      requireCronSecret(fakeReq(), res, () => { nextCalled = true; });
      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 503);
    });
  });

  it('rejects a request with no credential', () => {
    withSecret('s3cret-value', () => {
      const res = fakeRes();
      let nextCalled = false;
      requireCronSecret(fakeReq(), res, () => { nextCalled = true; });
      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
    });
  });

  it('rejects a wrong secret, including a prefix of the real one', () => {
    withSecret('s3cret-value', () => {
      for (const bad of ['nope', 's3cret', 's3cret-value-extra']) {
        const res = fakeRes();
        let nextCalled = false;
        requireCronSecret(fakeReq({ Authorization: `Bearer ${bad}` }), res, () => { nextCalled = true; });
        assert.equal(nextCalled, false, `accepted bad secret: ${bad}`);
        assert.equal(res.statusCode, 401);
      }
    });
  });

  it('accepts an Authorization: Bearer credential', () => {
    withSecret('s3cret-value', () => {
      const res = fakeRes();
      let nextCalled = false;
      requireCronSecret(fakeReq({ Authorization: 'Bearer s3cret-value' }), res, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
      assert.equal(res.statusCode, null);
    });
  });

  it('accepts x-cron-secret for a self-hosted pinger', () => {
    withSecret('s3cret-value', () => {
      const res = fakeRes();
      let nextCalled = false;
      requireCronSecret(fakeReq({ 'x-cron-secret': 's3cret-value' }), res, () => { nextCalled = true; });
      assert.equal(nextCalled, true);
    });
  });
});
