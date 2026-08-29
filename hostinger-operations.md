# Hostinger operations

The production deployment is a **long-running Node process on Hostinger** (Passenger),
not a serverless platform. `server/src/index.js` → `server/src/server.js` is the entry
point (`npm start --prefix server`), Express serves both the API and the SPA, and the
SPA files are served from `server/public`.

## Scheduled social posts

### Default behaviour

The scheduler runs **in-process and is on by default**. On boot,
`server/src/server.js` calls `startInProcessSocialScheduler()`, which polls every
**60 seconds** for `SocialPost` rows that are `SCHEDULED` with `scheduledFor <= now`.

60s was chosen because a pass with nothing due is two indexed reads against the
`[status, scheduledFor]` index — cheap enough to run every minute — and staff
schedule posts to the minute, so a longer interval would only publish late. The
interval is floored at 60s so a mistyped override cannot hammer the database.

No environment variable is required for scheduling to work.

### Environment variables

| Variable | Required | Effect |
| --- | --- | --- |
| `SOCIAL_SCHEDULER_ENABLED` | No | Set to `false` / `0` / `off` / `no` to stop the in-process runner. Anything else (or unset) leaves it on. |
| `SOCIAL_SCHEDULER_INTERVAL_MS` | No | Overrides the 60000 ms poll interval. Values under 60000 are raised to 60000; junk or `0` falls back to the default. |
| `CRON_SECRET` | No | Only needed if you want the optional external HTTP trigger below. Unset means that endpoint returns 503 and nothing else changes. |

Existing variables (`DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `PUBLIC_SITE_URL`,
SMTP, S3, Facebook/Instagram, `GROQ_API_KEY`, `GIVEBUTTER_WEBHOOK_SECRET`) are
unchanged — see `server/.env.example`.

### Verifying it is running in production

Look in the Hostinger Node app log for this line, printed once per process start:

```
[social-scheduler] In-process runner started, every 60s (pid 12345)
```

If it instead prints `In-process runner not started (disabled_by_env)`, the
`SOCIAL_SCHEDULER_ENABLED` variable is switched off. `(vercel_uses_cron)` would mean
a `VERCEL` variable is set in the environment, which should not happen on Hostinger.

A pass only logs when it does something, so silence between runs is normal. When a
post is claimed, published, failed, or a stale claim is recovered you get a JSON
summary line:

```
[social-scheduler] {"ranAt":"...","recovered":0,"considered":1,"claimed":1,"published":1,...}
```

The Marketing page also shows live status (mode, interval, next scheduled post, due
count, failed count) from `GET /api/social-posts/scheduler`.

### Optional external trigger

`GET`/`POST /api/cron/social-posts` runs exactly one scheduler pass. It is **not**
required — the in-process runner is the mechanism — but it is useful as a fallback if
the app process is restarted aggressively, and for triggering a pass by hand while
debugging.

It sits outside `requireAuth` and is authorised only by a shared secret, so it
refuses to run (503) unless `CRON_SECRET` is set. Authenticate with either header:

```
Authorization: Bearer <CRON_SECRET>
x-cron-secret: <CRON_SECRET>
```

Running this at the same time as the in-process runner is safe: see below.

### Why multiple processes cannot double-post

Passenger may run more than one application process for the same site, and an
external pinger can overlap with an in-process run. Nothing relies on there being a
single runner. A post is taken with a conditional update in `claimPost()`:

```141:151:server/src/services/socialPostScheduler.js
async function claimPost(id, now) {
  const { count } = await prisma.socialPost.updateMany({
    where: { id, status: 'SCHEDULED' },
```

That is a single SQL `UPDATE ... WHERE id = ? AND status = 'SCHEDULED'`. Exactly one
concurrent caller can move the row out of `SCHEDULED`; every other caller gets
`count = 0` and skips the post. Publishing happens only after a successful claim, so
the Facebook/Instagram call happens at most once per attempt regardless of how many
processes are polling.

If a process dies mid-publish, the row is left in `PUBLISHING`;
`recoverStaleClaims()` returns it to `SCHEDULED` after 15 minutes (or to `FAILED`
once the 3-attempt budget is spent).

## CORS allow-list

`server/src/utils/corsOrigins.js` decides which browser origins may call the API.
It trusts, and only trusts:

- `https://pawsitivetransformations.org` and `https://www.pawsitivetransformations.org`
  — both hosts serve the site directly (neither redirects to the other), so both
  are listed.
- `https://mediumslateblue-hornet-819977.hostingersite.com` — the Hostinger-assigned
  hostname for the same site, kept as an **exact** entry for checking a deploy.
- `http://localhost` / `http://127.0.0.1` on any port, for local development.
- Whatever `CLIENT_URL`, `PUBLIC_SITE_URL`, and the optional comma-separated
  `CLIENT_URLS` contain (see `server/.env.example`).

There is deliberately **no wildcard**. A previous `*.hostingersite.com` pattern
trusted every other Hostinger customer's subdomain against this API. If a new
host is ever needed, add it as an exact string here or via `CLIENT_URLS` — never
as a suffix match.

## SPA build mirror (`server/public`)

Express serves the SPA from `server/public` first, falling back to `client/dist`
(`server/src/app.js`). On Hostinger only `server/public` is deployed, so **a client
change is invisible in production until this directory is refreshed**. It is tracked
in git and has gone stale before.

After any client change:

```powershell
npm run build --prefix client
robocopy client\dist server\public /MIR
```

`/MIR` matters — without it, deleted old hashed bundles linger and `index.html` can
end up referencing files that no longer exist. Confirm `server/public/index.html` and
`client/dist/index.html` are identical before committing.

## Vercel artefacts

`vercel.json`, `api/index.js`, `scripts/vercel-sync-env.cjs`,
`server/scripts/vercel-postinstall.cjs` and the `process.env.VERCEL` branches in the
server are leftovers from a Vercel deployment. They are inert on Hostinger (`VERCEL`
is never set there) and have been left in place, but Hostinger is the deployment
target of record: do not add new platform behaviour behind `process.env.VERCEL`.
