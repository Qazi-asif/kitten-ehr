# Social media integrations — advisory (CR-108, question for devs)

You asked what is actually built, what other features depend on it, and what could
be cut versus kept. Here is the audit. Nothing in this document has been changed
in the code; it is for the scope discussion you asked for.

## Short answer

The auto-posting is roughly one-third real. Facebook and Instagram posting works,
but only when a human clicks "Publish now" on the Marketing page. There is no
scheduler anywhere in the codebase, so a post saved as SCHEDULED will simply never
go out — that is why the integrations look non-operational. X and TikTok are
checkboxes with no posting code behind them at all. The kitten "Publishing &
Social" tab never touches a social API; it opens the normal share dialog and logs
that a share happened.

## What is built

**Works today**

- Facebook and Instagram posting through the Meta Graph API
  (`server/src/services/socialMediaService.js`). Instagram requires a publicly
  reachable image URL.
- A connection test in Settings that reads back the page name and auto-detects the
  linked Instagram business account.
- Marketing page: compose a post, save it as a draft, and publish it immediately.
- Per-kitten Smart Share: opens the Facebook sharer or X intent window, or copies
  the caption for Instagram, then records the share in the kitten's post history.
- AI caption generation on the kitten Publishing & Social tab.

**Does not work**

- **Scheduling.** No cron, no interval, no worker reads scheduled posts. The
  "scheduled for" date is decorative. This is the single biggest gap.
- **X and TikTok.** No API integration exists. Selecting them is a no-op.
- **Images from the Marketing page.** They are stored as inline base64 data, which
  the Graph API cannot accept, so image posts from Marketing will fail on Facebook
  and always fail on Instagram.
- The "Posted" label in a kitten's share history is not confirmed delivery — it is
  written as soon as the share window opens.

## What depends on what

Two things share a name but are unrelated, and this matters for scoping.

**Publish targets are not social posting.** The `publishTargets` fields on cats,
events, and articles are what control whether something appears on the public
website. That logic is load-bearing and must stay regardless of what happens to
social. The `PublishingMatrix` control is also reused by the Calendar and the
Education Hub manager, not just the kitten tab.

One trap: the social service file also contains the helper that builds public
links for contract signing emails and foster portal invites. If that file is ever
deleted, that helper has to be moved out first or contract and portal emails
break.

Otherwise the Marketing feature is an island. Its database table has no relations
and nothing else reads it.

## Options

**Option A — cut Marketing entirely.** Removes the Marketing page, the social post
table, the Graph API code, and the Facebook/Instagram token settings. Lowest
maintenance. You lose the ability to post from the platform at all; staff would
post from Facebook and Instagram directly. Note the Facebook and Instagram profile
URLs in Settings must stay either way, since the public site footer uses them.

**Option B — keep a manual scheduler/calendar, drop the auto-posting.** Keep the
Marketing page as a planning tool: compose, schedule, and see what is going out
when, with staff posting manually at that time. Remove the Graph API code, tokens,
and the X/TikTok checkboxes. This matches how the feature is realistically used
today and removes the part that is broken and hard to maintain (Meta tokens expire
and need periodic re-authorization).

**Option C — finish it.** Add a scheduler, switch Marketing images to real hosted
uploads instead of inline data, and accept ongoing Meta token maintenance. X and
TikTok would each be a separate integration with their own approval process.

**Recommendation:** Option B. It keeps the part with real day-to-day value (a
shared plan of what is being posted and when) and drops the part that has never
worked reliably. It also leaves the door open to Option C later, since the
scheduler UI would already exist.

**Low-risk cleanup regardless of the option chosen:** there is dead code in the
social service with no callers anywhere, and the X/TikTok checkboxes can be
removed now since they can never publish.
