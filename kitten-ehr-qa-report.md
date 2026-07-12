# Kitten-EHR Live QA Report — kitten-ehr.vercel.app

Date: July 12, 2026
Scope: Full-project pass, both personas, live production deployment.

## Method key

- **Browser-confirmed** — navigated/clicked/typed in the real Chrome session and watched the result.
- **API-level, not UI-confirmed** — called the real endpoint via the page's own `fetch()` (real network, real auth cookies where noted) and read the raw response, without exercising the UI on top of it.
- **Code-level inference, not runtime-confirmed** — reasoned from source, no live check performed.

A general note on method for this pass: typing/form submission through the browser-automation tool was unreliable for text-entry-heavy flows (e.g. a portal login form), so those specific steps fall back to API-level checks and are labeled as such below. Native `<select>` dropdowns required a scripted `form_input` call rather than a physical click-to-open — noted inline where it applies, since it's still a real UI control being driven, just via a different input mechanism than a mouse click.

---

## Persona 1: Staff/Admin

Signed in as "Lauren Ashley Shapiro" (Super Admin) — this was an **already-authenticated session** found on first navigation, not a login I performed by typing credentials. The actual login screen/flow was not exercised in this pass.

### Kittens

- Kitten list (`/admin/kittens`) — 3 kittens, thumbnails render correctly (cramel, tommy, and a "Board Games" litter group of 2). **CLEAN, browser-confirmed.**
- Kitten profile tab bar (Profile / Publishing & Social / Updates / Health / Documents / Placements / Contracts / Notes) all present on "cramel." **CLEAN, browser-confirmed.**
- Contracts tab on kitten profile — opens, shows correct empty state ("No agreements on file for this kitten yet"). **CLEAN, browser-confirmed.**
- Documents tab — Document Library UI renders, upload dropzone present. **CLEAN, browser-confirmed** (took ~3s to resolve past "Loading tab data...", not flagged as a bug, just slow).
- Health tab — after the "Loading protocols..." state resolves, a red **"Failed to load protocols"** error banner appears simultaneously with the empty "No active protocols for this kitten yet." state underneath it. **BROKEN, browser-confirmed.** Reproduced twice.
- Publishing & Social tab — "Publishing Matrix" shows **0/6 selected**, including "Website" unchecked, for a kitten whose status is "Available for Adoption." Confirmed via the public API (see Public Site section below) that this kitten shows up on the public site anyway — meaning the Publishing Matrix toggle does not actually gate public visibility, or at minimum isn't in sync with what publishes. **DISCONNECTED, browser + API-confirmed.**
- Photo upload / delete-last-photo (#23 regression check), create/edit kitten flow, status changes: **not covered in this pass** — ran out of scope budget before reaching these. Not re-verified either way.

### Fosters

- Foster creation form — "Also create a portal account for this foster" checkbox renders, **defaulted checked**, with correct dynamic helper text ("Sends `<email>` a link to set up limited-access Foster Portal login"). **CLEAN, browser-confirmed (UI only).** I did not submit the form — doing so would create a real production Foster record and trigger a real account-setup email, which needs your go-ahead first.
- Foster list — capacity column shows **"3 / 25"** for Lauren Ashley Shapiro.
- Foster detail page for the same foster — header shows **"Capacity 1 / 25"** and **"1 total placements,"** and the Placement History table lists exactly one row (kitten "tommy"). The list-page count (3) is higher than the detail page's own total-placements count (1), which shouldn't be possible if both are counting current/active placements the same way. **CONFUSING (borderline BROKEN — the two numbers can't both be right), browser-confirmed.**
- Placement History table — **Actions column present**, "End Placement" link renders correctly next to the "tommy" row. **CLEAN, browser-confirmed (UI only).** I did not click it — it's a real, likely-irreversible state change on a live placement, so I left it for you to trigger.
- Foster Agreements section on the foster detail page — shows a real linked contract ("Foster Care Agreement — supplies NOT provided by the Rescue," kitten Scrabble, status SENT, with a working View link). Confirms contracts are still linked to person records correctly. **CLEAN, browser-confirmed.**
- Foster Wishlists section — empty state ("No wishlist links yet") renders cleanly, not an error. **CLEAN, browser-confirmed.**

### Applications

- Applications list — 2 adoption applications ("sarim," "QA Tester"), 0 foster applications. Both tables and the "View" action render correctly. **CLEAN, browser-confirmed.**
- Opening an application (clicking "View") updates the URL immediately but the detail panel itself takes a further 2–5s to actually render below the list — not a bug, just slow, confirmed by waiting it out twice. **CLEAN, browser-confirmed** (note the latency).
- Application review panel — Status dropdown (New/Under Review/Approved/Denied), Review Notes field, "Update Status & Notify Applicant" button, full applicant/home/adoption-details/documents sections all render. **CLEAN, browser-confirmed.**
- I approved the "sarim" application for real (its listed email happened to be your own address, so the resulting notification email is harmless) to test the downstream flow:
  - Status persisted as "Approved" after save, both in the list and the detail panel. **CLEAN, browser-confirmed.**
  - **"Create Contract" button appeared** at the top of the approved application's panel. **CLEAN, browser-confirmed.** This is the specific item you asked me to re-verify — it works.

### Contracts

- Clicking "Create Contract" navigated to `/admin/contracts?createFor=application:36` and the "New Draft Contract" form **auto-filled** Signer Name, Signer Email, Address, and Phone directly from the approved application, and auto-linked the applicant record (green "sarim" chip). **CLEAN, browser-confirmed.**
- Minor gap: the kitten field ("Scrabble") was populated as **free text**, not linked to the real Kitten record, even though a kitten named "Scrabble" does exist in the system (confirmed elsewhere — it has an active foster placement and a signed contract on file). **DISCONNECTED, browser-confirmed.**
- Submitting the draft created a real contract row instantly (status **SENT**). **CLEAN, browser-confirmed.**
- Signing flow: Electronic Signature modal opens with the agreement text, a pre-filled signer name, two required confirmation checkboxes, and a live signature pad (I drew a real stroke). **CLEAN, browser-confirmed.**
  - Note on method: the "Sign & Submit" button was below the visible viewport and normal scrolling wouldn't reach it (the modal doesn't scroll independently at this window size), so I used `scrollIntoView` on the real DOM button to bring it into view, then clicked its actual on-screen coordinates — still a real physical click on the real button, just repositioned via script first rather than reached by manual scrolling.
  - After clicking, the button showed "Submitting Signature..." for ~8 seconds before completing (consistent with the slow-backend pattern seen elsewhere in this pass), then the contract row updated to **status SIGNED**, a real signed date, and the "Email Signed PDF" action switched from disabled ("No PDF available for this contract") to active — confirming server-side PDF generation completed. **CLEAN, browser-confirmed.**
- **Post-signing status-confirmation modal** (the "mark kitten as adopted?" prompt built earlier this project): **not observed.** The signing modal closed directly into the refreshed contract list with no visible intermediate prompt in either of the two post-submit screenshots I took. I can't rule out a timing gap between screenshots swallowing a fast-dismissing modal, so I'm reporting this as **not confirmed either way** rather than certainly broken — worth a direct re-check with tighter screenshot timing.
- Template types beyond "Cat Adoption Agreement," household acknowledgment signature blocks, org-signature PDF embedding, contract history views (per-person/per-kitten): **not covered in this pass.**

### Settings

- Organization tab — Org Name, Mission Statement, EIN, Contact Phone/Email, Mailing Address all populated with real saved values on load. **CLEAN, browser-confirmed.**
- Document Logo — real logo image renders with a working "Remove logo" control. **CLEAN, browser-confirmed.**
- Document Signature — section renders, but shows "No file chosen" with no existing-signature preview. I have no way to tell from this pass whether that's a correct empty state (nothing uploaded yet) or a persistence bug (something was uploaded and isn't loading back) — **inconclusive, browser-confirmed rendering only, contents unverifiable.**
- SMTP / email section — From Email, From Name, and Admin Notification Email all populated with real values (`info@pawsitivetransformations.org`). **CLEAN, browser-confirmed.**
- **Donation Page toggle is currently OFF.** Confirmed this degrades gracefully on the public site (see Public Site section) rather than breaking — but flagging since it means the public donate flow is intentionally disabled right now, not broken.
- Roles & Permissions tab — **both "Foster Parent" (6 permissions) and "Foster Self-Service Portal" (0 permissions, correctly empty since portal auth doesn't check permissions) are present and clearly distinct**, exactly as designed. **CLEAN, browser-confirmed.** This was the specific item you asked me to re-verify — it's live and correct.
- Users tab — only **one** user account exists in the system: Lauren Ashley Shapiro (Super Admin). No portal-role accounts appear in this list at all. See Persona 2 below — this is the reason Persona 2 couldn't be tested end-to-end.

### Users & Roles (public-site-adjacent)

Covered above under Settings — role list confirms both roles exist and are distinct.

---

## Persona 2: Foster Portal user

This persona could **not** be tested end-to-end, for a concrete reason: the Settings → Users list (which lists every `User` row regardless of role, per how that page queries the database) shows **exactly one account, the Super Admin**. No portal-role account currently exists in the live database that I could find or log into. I did not create one — doing so requires submitting the Foster form with the portal checkbox checked, which sends a real account-setup email and creates a real production record, and I held off pending your go-ahead (see Fosters section above).

What I *could* still test without a portal credential — the negative/boundary case:

- `GET /api/fosters`, `/api/kittens`, `/api/settings`, `/api/portal` with **no auth token at all** (real `fetch()` calls from the live page, `credentials: 'omit'`) → all four returned **401 `{"error":"Authentication required"}`**. **API-level, not UI-confirmed.** This confirms these routes reject unauthenticated requests, but it is **not** the specific test you asked for — it doesn't prove a *valid portal token* gets rejected with 403 from staff routes (which is the actual scoping guarantee that matters). That specific check needs a real portal credential and hasn't been verified live.
- `POST /api/portal/auth/set-password` with a garbage token → returned **400 `{"error":"Invalid or expired link"}`**, which is the correct rejection behavior for an invalid token (not a 500 or a crash). **API-level, not UI-confirmed.**

Net honest status for Persona 2: **auth-rejection-of-unauthenticated-requests works; the specific "valid portal token is blanket-rejected from staff routes" guarantee remains unverified live** (it was verified at the middleware code level earlier this session, but that's a code-level claim, not what this pass confirmed). The portal-facing pages themselves (viewing your own placements, uploading documents) are confirmed **not built yet** — the `/api/portal` route is a stub — so even with a working credential, there'd be nothing to see there beyond auth working.

---

## Public Site (unauthenticated visitor)

- Homepage (`/`) — loads cleanly, nav, hero, and footer all render. **CLEAN, browser-confirmed.**
- Donate page (`/donate`) — with the Donation Page toggle OFF in Settings, this correctly shows a friendly "Online giving is coming soon... completing our California charitable registration" message with links to Foster/Meet the Cats, instead of a broken or half-configured donation form. **CLEAN, browser-confirmed.** (Givebutter-widget-when-enabled behavior itself was not tested, since the toggle is off.)
- **Public kitten grid (`/kittens`) is broken: permanently stuck on "Loading cats..." and "Loading success stories...".** Waited 12+ seconds across repeated screenshots; never resolves. **This is not a data or API problem** — I confirmed via the page's own `fetch('/api/public/kittens')` that the endpoint returns **200 with all 3 kittens' full data** (including "cramel," which has the Publishing Matrix "Website" checkbox unchecked — so the API isn't even filtering by that flag). The React app has the data available and never finishes rendering it. **BROKEN, browser-confirmed (the stuck loading state) + API-confirmed (the underlying data is fine) — this is a front-end rendering bug, high severity: real visitors currently cannot browse cats at all.**
- **Public kitten "Meet Me" page (`/kittens/25`) is broken the same way: permanently stuck on "Loading profile...".** Confirmed via network inspection that all four backing calls the page makes (`/api/public/kittens/25`, `/updates`, `/wishlists`, plus the page shell itself) return **200 with valid data** — including `wishlists: []` (a clean empty array, not an error). **BROKEN, browser-confirmed + API-confirmed.** Same likely root cause as the grid — a shared rendering/state bug across the public kitten-facing pages.
- **"Failed to load wishlists" — direct answer this time:** I could not reproduce this exact error message. The wishlists endpoint (`/api/public/kittens/25/wishlists`) returns a clean **200** with an empty array, not an error. However, since the whole profile page never finishes loading in the first place, there's no way to reach the point in the UI where a wishlist section (or its error state) would even render. My best honest read: either the original bug has since been fixed at the API layer, or it's now masked by the newer, more severe "page never loads" bug found above. I can't tell you with certainty which, because the symptom I was asked to reproduce is currently unreachable in the UI.
- **Dead "WISHLIST" button — direct answer this time:** also unreachable for the same reason — the kitten profile page that would contain this button never finishes rendering in this pass, so I could not click it or observe its current state. Not confirmed fixed, not confirmed still broken — **genuinely unknown as of this pass**, and worth noting that even if the button itself got fixed, it wouldn't matter right now since nobody can reach it.
- Adoption/foster application forms, "Meet Me" page for a non-available/adopted kitten specifically: **not covered in this pass** (blocked by the same loading bug — there was no way to reach an individual kitten page to test the adopted-kitten friendly-message behavior).

---

## Summary Table

| Area | Item | Status | Method |
|---|---|---|---|
| Kittens | List thumbnails | CLEAN | Browser-confirmed |
| Kittens | Profile tabs render | CLEAN | Browser-confirmed |
| Kittens | Contracts tab | CLEAN | Browser-confirmed |
| Kittens | Documents tab | CLEAN | Browser-confirmed |
| Kittens | Health tab protocols | **BROKEN** ("Failed to load protocols") | Browser-confirmed |
| Kittens | Publishing Matrix vs. public visibility | **DISCONNECTED** | Browser + API-confirmed |
| Kittens | Photo upload / delete-last-photo (#23) | Not covered | — |
| Fosters | Portal-account checkbox (form) | CLEAN | Browser-confirmed (not submitted) |
| Fosters | Capacity count (list vs. detail page) | **CONFUSING/possibly BROKEN** (3/25 vs. 1/25, 1 total placement) | Browser-confirmed |
| Fosters | Placement Actions column / End Placement | CLEAN | Browser-confirmed (not executed) |
| Fosters | Foster Agreements linkage | CLEAN | Browser-confirmed |
| Applications | Review panel + status update | CLEAN | Browser-confirmed |
| Applications | Create Contract CTA on approval | CLEAN | Browser-confirmed |
| Contracts | Draft auto-fill from application | CLEAN | Browser-confirmed |
| Contracts | Kitten link on auto-filled draft | **DISCONNECTED** (freetext, not linked record) | Browser-confirmed |
| Contracts | Signing flow (pad, checkboxes, submit) | CLEAN | Browser-confirmed |
| Contracts | PDF generation on sign | CLEAN | Browser-confirmed |
| Contracts | Post-signing status modal | **UNCONFIRMED** (not observed, may be timing) | Browser-confirmed attempt |
| Settings | Organization fields persist | CLEAN | Browser-confirmed |
| Settings | Document Logo | CLEAN | Browser-confirmed |
| Settings | Document Signature persistence | Inconclusive | Browser-confirmed (rendering only) |
| Settings | SMTP fields persist | CLEAN | Browser-confirmed |
| Settings | Donation toggle (OFF) → graceful public page | CLEAN | Browser-confirmed |
| Settings | Roles: Foster Parent + Foster Self-Service Portal distinct | CLEAN | Browser-confirmed |
| Persona 2 | Portal login | **NOT TESTABLE** (no portal account exists) | — |
| Persona 2 | Staff routes reject unauthenticated requests | CLEAN | API-level |
| Persona 2 | Staff routes reject *valid portal token* specifically | **UNVERIFIED LIVE** | Code-level only (from earlier this session) |
| Persona 2 | set-password rejects invalid token correctly | CLEAN | API-level |
| Public site | Homepage | CLEAN | Browser-confirmed |
| Public site | Donate page (toggle off) | CLEAN | Browser-confirmed |
| Public site | Kitten grid (`/kittens`) | **BROKEN** (stuck loading despite valid API data) | Browser + API-confirmed |
| Public site | Kitten "Meet Me" page (`/kittens/:id`) | **BROKEN** (stuck loading despite valid API data) | Browser + API-confirmed |
| Public site | "Failed to load wishlists" | Not reproducible as originally described; API returns 200 | API-level |
| Public site | Dead WISHLIST button | **UNKNOWN** — unreachable due to the loading bug above | Unconfirmed |
| Public site | Adopted-kitten friendly message | Not covered | — |

**Highest-priority items for you to look at first:** the public `/kittens` grid and individual kitten profile pages are both stuck permanently loading in production right now, despite their backing APIs working correctly — this is the one item on this list that affects every real visitor to the site, not just staff workflows.
