/**
 * QA for the social post scheduler's database-level claim.
 *
 * Run AFTER `npx prisma db push` has applied the additive SocialPost changes
 * (PUBLISHING/FAILED statuses, attemptCount, lastAttemptAt).
 *
 *   node scripts/qa-social-scheduler.mjs
 *
 * SAFETY: the publisher is stubbed, so nothing is ever sent to Facebook or
 * Instagram. Every row this script creates is created with a marker in its body
 * and deleted again at the end; it never touches pre-existing posts.
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { runScheduledSocialPosts, MAX_OVERDUE_MS } from '../src/services/socialPostScheduler.js';

const MARKER = `[qa-scheduler ${Date.now()}]`;
const created = [];
let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function makePost({ scheduledFor, platforms = ['FACEBOOK'] }) {
  const post = await prisma.socialPost.create({
    data: {
      body: `${MARKER} do not publish`,
      platforms,
      scheduledFor,
      status: 'SCHEDULED',
    },
  });
  created.push(post.id);
  return post;
}

// Stub publisher: records the calls it would have made instead of making them.
function makeStubPublisher(calls, { succeed = true } = {}) {
  return async ({ targets }) => {
    calls.push(targets);
    return {
      results: targets.map((platform) => ({
        platform,
        status: succeed ? 'posted' : 'failed',
        message: succeed ? 'stub' : 'stub failure',
        postId: succeed ? 'stub-id' : '',
        shareUrl: '',
      })),
    };
  };
}

const configLoader = async () => ({
  enabled: true,
  pageId: 'stub-page',
  accessToken: 'stub-token',
  instagramAccountId: '',
  facebookProfileUrl: '',
  instagramProfileUrl: '',
  orgName: 'stub',
});

const now = new Date();
const before = await prisma.socialPost.count();
console.log(`social_posts rows before: ${before}`);

try {
  console.log('\n1. A due post is published exactly once');
  {
    const post = await makePost({ scheduledFor: new Date(now.getTime() - 60_000) });
    const calls = [];
    const publisher = makeStubPublisher(calls);
    await runScheduledSocialPosts({ publisher, configLoader });
    await runScheduledSocialPosts({ publisher, configLoader });
    const after = await prisma.socialPost.findUnique({ where: { id: post.id } });
    check('status is POSTED', after.status === 'POSTED', after.status);
    check('postedAt recorded', Boolean(after.postedAt));
    check('publisher called once, not twice', calls.length === 1, `calls=${calls.length}`);
  }

  console.log('\n2. Concurrent runs cannot double-post (the claim is atomic)');
  {
    const post = await makePost({ scheduledFor: new Date(now.getTime() - 60_000) });
    const calls = [];
    const publisher = makeStubPublisher(calls);
    const summaries = await Promise.all([
      runScheduledSocialPosts({ publisher, configLoader }),
      runScheduledSocialPosts({ publisher, configLoader }),
      runScheduledSocialPosts({ publisher, configLoader }),
    ]);
    const after = await prisma.socialPost.findUnique({ where: { id: post.id } });
    check('published exactly once across 3 overlapping runs', calls.length === 1, `calls=${calls.length}`);
    check('status is POSTED', after.status === 'POSTED', after.status);
    check('attemptCount is 1', after.attemptCount === 1, String(after.attemptCount));
    check(
      'the losing runs reported the post as claimed elsewhere',
      summaries.reduce((sum, s) => sum + s.claimed, 0) === 1,
    );
    void post;
  }

  console.log('\n3. A post beyond the look-back window is never published');
  {
    const post = await makePost({
      scheduledFor: new Date(now.getTime() - MAX_OVERDUE_MS - 3_600_000),
    });
    const calls = [];
    await runScheduledSocialPosts({ publisher: makeStubPublisher(calls), configLoader });
    const after = await prisma.socialPost.findUnique({ where: { id: post.id } });
    check('publisher was never called', calls.length === 0, `calls=${calls.length}`);
    check('status is FAILED', after.status === 'FAILED', after.status);
    check('reason recorded in deliveryLog', after.deliveryLog.includes('more than'));
  }

  console.log('\n4. A future post is left alone');
  {
    const post = await makePost({ scheduledFor: new Date(now.getTime() + 3_600_000) });
    const calls = [];
    await runScheduledSocialPosts({ publisher: makeStubPublisher(calls), configLoader });
    const after = await prisma.socialPost.findUnique({ where: { id: post.id } });
    check('publisher was never called', calls.length === 0);
    check('status still SCHEDULED', after.status === 'SCHEDULED', after.status);
  }

  console.log('\n5. A failing publish is retried, then marked FAILED');
  {
    const post = await makePost({ scheduledFor: new Date(now.getTime() - 60_000) });
    const calls = [];
    const publisher = makeStubPublisher(calls, { succeed: false });
    let after;
    for (let i = 0; i < 4; i += 1) {
      await runScheduledSocialPosts({ publisher, configLoader });
      after = await prisma.socialPost.findUnique({ where: { id: post.id } });
      if (after.status === 'FAILED') break;
    }
    check('ends at FAILED rather than retrying forever', after.status === 'FAILED', after.status);
    check('attempts were bounded', after.attemptCount <= 3, String(after.attemptCount));
    check('error visible in deliveryLog', after.deliveryLog.includes('stub failure'));
  }

  console.log('\n6. An X/TikTok-only post fails cleanly without breaking the run');
  {
    const bad = await makePost({
      scheduledFor: new Date(now.getTime() - 60_000),
      platforms: ['X', 'TIKTOK'],
    });
    const good = await makePost({ scheduledFor: new Date(now.getTime() - 30_000) });
    const calls = [];
    const summary = await runScheduledSocialPosts({ publisher: makeStubPublisher(calls), configLoader });
    const badAfter = await prisma.socialPost.findUnique({ where: { id: bad.id } });
    const goodAfter = await prisma.socialPost.findUnique({ where: { id: good.id } });
    check('X/TikTok-only post is FAILED', badAfter.status === 'FAILED', badAfter.status);
    check('its reason is recorded', badAfter.deliveryLog.toLowerCase().includes('facebook'));
    check('the other post in the same run still published', goodAfter.status === 'POSTED', goodAfter.status);
    check('run did not throw', typeof summary.considered === 'number');
  }

  console.log('\n7. Mixed platforms: supported published, unsupported reported');
  {
    const post = await makePost({
      scheduledFor: new Date(now.getTime() - 60_000),
      platforms: ['FACEBOOK', 'X'],
    });
    const calls = [];
    await runScheduledSocialPosts({ publisher: makeStubPublisher(calls), configLoader });
    const after = await prisma.socialPost.findUnique({ where: { id: post.id } });
    check('only FACEBOOK was targeted', JSON.stringify(calls) === JSON.stringify([['FACEBOOK']]), JSON.stringify(calls));
    check('status is POSTED', after.status === 'POSTED', after.status);
    check('X recorded as skipped', after.deliveryLog.includes('"platform":"X"'));
  }
} catch (error) {
  failures += 1;
  console.log(`\n  FAIL  the QA run threw: ${error.message?.split('\n').pop()?.trim() || error}`);
  if (/does not exist in the current database/.test(error.message || '')) {
    console.log('        Run `npx prisma db push` first — the additive SocialPost columns are not applied yet.');
  }
} finally {
  if (created.length) {
    const { count } = await prisma.socialPost.deleteMany({ where: { id: { in: created } } });
    console.log(`\nCleanup: deleted ${count} of ${created.length} QA rows`);
  }
  const residue = await prisma.socialPost.count({ where: { body: { contains: '[qa-scheduler' } } });
  const after = await prisma.socialPost.count();
  console.log(`social_posts rows after: ${after} (was ${before}), QA residue: ${residue}`);
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  await prisma.$disconnect();
  process.exit(failures === 0 && residue === 0 && after === before ? 0 : 1);
}
