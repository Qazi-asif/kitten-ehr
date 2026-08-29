# Hostinger operations

The production deployment is a **long-running Node process on Hostinger** (Passenger),
not a serverless platform. `server/src/index.js` → `server/src/server.js` is the entry
point (`npm start --prefix server`), Express serves both the API and the SPA, and the
SPA files are served from `server/public`.

## Deploy procedure

Three steps, in this order, every time. **Step 2 is not optional and has no
"probably fine" case.**

```powershell
# 1. Get the code
git pull

# 2. STOP. APPLY THE SCHEMA. Do not skip. Do not skip when the diff
#    "looks like frontend only" — check it, do not assume.
npx prisma db push --schema server/prisma/schema.prisma
npx prisma generate --schema server/prisma/schema.prisma

# 3. Only now restart the app (Hostinger panel: Node.js app -> Restart)
```

### Why step 2 exists

This project has no migration files — the schema is applied with `db push`. So
nothing applies it automatically: not `git pull`, not `npm install`, not the
restart. If you skip it, the deployed Prisma client queries columns the database
does not have and Postgres returns error **P2022** on *every* query touching
that table.

That has taken the live site down three times:

| Missed change | What broke |
| --- | --- |
| `Wishlist.groupName`, `Wishlist.sortOrder` | `GET /api/wishlists` returned 500 |
| `Kitten.coatPattern` | Admin cats list, **the public adoptable-cats page**, foster portal, litter and placement views, report generation — every kitten query |
| `SocialPost.attemptCount`, `lastAttemptAt`, `PUBLISHING`/`FAILED` | Scheduled social posts silently stopped publishing, with no visible error |

Note the second row: a missing column on `Kitten` is a **public-facing
outage**, not an admin inconvenience.

### `db push` must target production

`prisma db push` writes to whatever `DATABASE_URL` is resolved **at the moment
you run it**, and `server/.env` on your laptop points at your dev database. A
`db push` run locally reports success and changes nothing in production. This
has genuinely caused confusion here.

So: run step 2 **in the Hostinger shell, in the deployed directory**, where
`server/.env` holds the production `DATABASE_URL`. Before pushing, confirm you
are pointed at the right database without printing the URL:

```powershell
node -e "const u=new URL(process.env.DATABASE_URL); console.log(u.hostname)"
```

Never paste a connection string into a command line or a chat — it ends up in
shell history and logs.

### Verifying step 2 worked

Ask the database, not your memory. This is read-only and prints nothing
sensitive:

```powershell
npx prisma migrate diff --from-schema-datasource server/prisma/schema.prisma --to-schema-datamodel server/prisma/schema.prisma --exit-code
```

- **Exit code 0** and `No difference detected` — the database matches. Proceed.
- **Exit code 2** — there is still drift, and it lists the objects. Step 2 did
  not work, or ran against the wrong database. Do not restart; fix it first.

After the restart, check the Hostinger Node app log. A clean boot says nothing
about drift. If step 2 was missed you get the loud block described under
[Startup drift check](#startup-drift-check) below.

Finally, if the deploy included client changes, refresh the SPA mirror — see
[SPA build mirror](#spa-build-mirror-serverpublic).

## Startup drift check

Because discipline alone has failed three times, the app checks itself. Once
the server is listening, `server/src/utils/schemaDriftCheck.js` compares the
running Prisma client's datamodel against the live database's catalogue
(`information_schema.columns` and `pg_enum`) and logs any object the client
expects but the database lacks:

```
[schema-drift] ========================================================================
[schema-drift] SCHEMA DRIFT: the database is missing 5 object(s) that this
[schema-drift] build of the Prisma client expects. Queries touching them will fail.
[schema-drift]
[schema-drift]   missing column      Kitten.coatPattern
[schema-drift]   missing column      social_posts.attemptCount
[schema-drift]   missing column      social_posts.lastAttemptAt
[schema-drift]   missing enum value  SocialPostStatus.FAILED
[schema-drift]   missing enum value  SocialPostStatus.PUBLISHING
[schema-drift]
[schema-drift] FIX: against the production DATABASE_URL, run
[schema-drift]        npx prisma db push && npx prisma generate
[schema-drift]      then restart the app. See hostinger-operations.md.
[schema-drift] ========================================================================
```

Seeing that block means **step 2 was skipped** — go run it.

It is a smoke alarm, not a circuit breaker, and deliberately so:

- It only ever calls `console.warn`. It never exits, never throws, and never
  changes a response. A false positive cannot take the site down, which matters
  because the guard must be safer than the bug it detects.
- It runs fire-and-forget *after* `server.listen`, so it adds no boot latency
  (the starter returns in well under a millisecond; the two queries take
  ~150 ms on a warm pool, off the critical path). This matters because Passenger
  boots the app on demand.
- Two `SELECT`s against system catalogues — read-only, verified by running them
  inside a `SET TRANSACTION READ ONLY` transaction.
- If the database is unreachable, the queries fail, or it exceeds its 8 s
  timeout, it gives up silently and the app is unaffected.
- It prints object names only, never a connection string.

It reports missing tables, columns, and enum values — the things that cause
P2022 and failed writes. It does not check indexes, which affect performance
rather than correctness; `prisma migrate diff` above is the exhaustive check.

| Variable | Required | Effect |
| --- | --- | --- |
| `SCHEMA_DRIFT_CHECK` | No | On by default in production (and whenever `NODE_ENV` is unset, as on Hostinger). Off when `NODE_ENV` is `development` or `test`, because local drift while editing the schema is normal and a warning on every dev boot is one everybody learns to ignore. Set `true` to force it on, `false` to switch it off. |
| `SCHEMA_DRIFT_CHECK_DEBUG` | No | Set to any value to log why the check skipped or failed. Off by default so a failing check stays quiet. |

To run the check by hand against the deployed environment:

```powershell
node -e "import('./src/loadEnv.js').then(()=>import('./src/utils/schemaDriftCheck.js')).then(async m=>{const r=await m.checkSchemaDrift();console.log(r.checked?r.missing:'check did not run')})"
```

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
`SOCIAL_SCHEDULER_ENABLED` variable is switched off.

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

## Vercel artefacts (removed)

The app was once deployed on Vercel. That scaffolding — `vercel.json`,
`api/index.js`, `scripts/vercel-sync-env.cjs`,
`server/scripts/vercel-postinstall.cjs`, the `vercel:*` npm scripts — and every
`process.env.VERCEL` branch in the server have been deleted. The serverless
branches were inert here (`VERCEL` is never set on Hostinger), so only the
Hostinger paths remain: uploads go to object storage when configured and to local
disk otherwise, the in-process auth cache is always on, and the social-post
scheduler always uses the in-process runner.

Hostinger is the deployment target of record. Do not reintroduce platform
branching behind `process.env.VERCEL`.

Historical data note: uploads created under the old serverless deployment could
be stored as base64 data URLs in Postgres. Writes never produce that format any
more, but the read paths (`documentController`, `applicationController`,
`publicController`, `utils/thumbnail.js`, `utils/contractPdf.js`) still decode it
and must keep doing so.
