# Kitten-EHR Backlog Cleanup — Consolidated Plan

Every finding below is grounded in a fresh read of the actual file (paths and line numbers given). Two items (2 and 9) also needed a live database query to fully confirm — that query is **blocked in this environment** (details in a note before Item 2). No code has been changed. This is plan-only, per your instructions.

---

## Group A — Investigate and fix

### Item 1 — Health tab "Failed to load protocols."
**Root cause, confirmed:** `client/src/components/admin/KittenHealthTab.jsx`, `loadProtocolData()` (lines 52-71) fires three requests with a single `Promise.all([fetchProtocols(), fetchKittenActiveProtocols(kittenId), fetchKittenProtocolDoses(kittenId)])`. If *any one* of the three rejects, the whole `Promise.all` rejects — `.catch` sets `error`, but `activeProtocols`/`doses` never get updated and stay at their `useState([])` defaults. The render logic (lines 149-150) shows "No active protocols for this kitten yet." whenever `currentProtocols.length === 0` — with no check for `error`. So a genuine fetch failure and the empty-state message render simultaneously, exactly like the `AvailableKittensPage` bug fixed earlier this session.

**Proposed fix:** gate the "No active protocols" and "No protocol doses scheduled" empty-state messages on `!error` as well as the length check, so a failed fetch shows only the error (with a retry action, matching the pattern already shipped this session), never a misleading empty state.

**Files:** `client/src/components/admin/KittenHealthTab.jsx`
**Risk:** Low. Pure client-side render-logic fix, same shape as an already-shipped fix this session.

---

### Item 2 — Foster capacity count mismatch
**Root cause, confirmed at the code level; exact live numbers NOT confirmed (see note below).**

Two different data sources are used to represent "how many kittens does this foster currently have":
- `client/src/pages/FosterListPage.jsx:108` — shows `foster._count.currentKittens`, a live count of `Kitten` rows whose `currentFosterId` FK points to this foster (query in `server/src/controllers/fosterController.js:26`).
- `client/src/pages/FosterDetailPage.jsx:153,174` — shows `activePlacements`, computed client-side by filtering the `Placement` table for rows with no `dischargeDate` (a separate historical join table, `server/src/controllers/placementController.js`).

These are two independent representations that only stay in sync if every foster/kitten assignment goes through `createFosterPlacement`'s transaction (`placementController.js:94-122`), which does keep them consistent — it closes the kitten's prior placement, creates a new one, and sets `currentFosterId` all in one transaction. **But** `server/src/controllers/kittenController.js:230-231` shows the generic kitten-update endpoint (`PATCH /api/kittens/:id`) also accepts a raw `currentFosterId` field directly, completely bypassing the `Placement` table. Any path that edits a kitten's `currentFosterId` outside the placement transaction — a direct API call, or seed/import data — will desync the two counts: `currentKittens` reflects the FK, `activePlacements` reflects `Placement` rows, and nothing keeps them reconciled after that point.

**Blocked verification:** I attempted to query the live database directly (same pattern as the existing `server/scripts/query-contracts-28-34.mjs`) to confirm the exact numbers for the specific foster you saw "3/25" vs "1/25" on. The Prisma client in this sandbox was generated with Windows-only binary targets and can't execute against the Neon database from this Linux environment (`Error: Prisma Client could not locate the Query Engine for runtime "debian-openssl-3.0.x"`). I also tried the live site's authenticated API and got a 401 (no active admin session available to me). **I cannot independently confirm the specific foster's current numbers before you approve a fix.**

**Proposed fix (mechanism, pending your input on which count is "correct"):** Decide which source is authoritative — I'd lean toward `Placement` rows (since discharge/history logic already lives there and it's the auditable source), in which case `currentKittens`/FosterListPage's count should be replaced with the same active-placement-count logic used on the detail page, and `currentFosterId` should stop being a directly-writable field on the generic kitten update endpoint (removed from `kittenValidation.js`'s update schema and `kittenController.js:230-231`, forcing all foster assignment through the transactional path). That's a real behavior change to the generic kitten PATCH endpoint, so I'm flagging it as a decision point rather than assuming.

**Decision needed from you:** (a) which count should be authoritative, and (b) can you run a quick query yourself (or grant me a working admin login) so I can confirm the actual drifted numbers before I touch anything here?

**Files (if approved):** `server/src/controllers/fosterController.js`, `server/src/controllers/kittenController.js`, `server/src/validations/kittenValidation.js`, possibly `client/src/pages/FosterListPage.jsx`
**Risk:** Medium — touches the generic kitten-update endpoint's accepted fields, and a foster-count display staff rely on daily.

---

### Item 3 — Publishing Matrix vs. public visibility
**Root cause, confirmed — this is a real access-control gap, not decorative.**

`server/src/utils/publishTargets.js:12-19`:
```js
export function buildPublicWebsiteWhereClause() {
  return {
    OR: [
      { publishTargets: { isEmpty: true } },
      { publishTargets: { has: 'WEBSITE' } },
    ],
  };
}
```
This is the filter both `getPublicKittens` and `getPublicKittenById` use. It says: show this kitten publicly if `publishTargets` is **empty** OR contains `'WEBSITE'`. The `isEmpty: true` branch means a kitten with *nothing* checked in the Publishing Matrix is still publicly visible by default.

Concretely, this reproduces your exact QA finding whenever "Website" was the *only* platform ever checked for a kitten: unchecking it (`PublishingMatrix.jsx`'s `togglePlatform`, `client/src/components/PublishingMatrix.jsx:42-47`) sets `publishTargets` to `[]` — and the `isEmpty: true` branch immediately makes that kitten publicly visible again, the opposite of what unchecking "Website" should do. If other platforms remain checked after unchecking Website, the array is non-empty and doesn't contain `'WEBSITE'`, so it correctly excludes — meaning the bug is specifically reproducible for single-platform (or zero-platform) kittens.

This is very likely intentional as a backward-compatibility fallback (so kittens created before the Publishing Matrix feature existed, with no `publishTargets` set at all, don't silently vanish from the public site) — but it has the side effect of making "Website" not function as a true gate once a kitten reaches the empty-array state.

**Not fixing per your instruction.** Decision needed: should `publishTargets: []` mean "public by default" (current, protects legacy records) or "not published until explicitly configured" (correct as an access-control model, but would require backfilling `publishTargets: ['WEBSITE']` on every currently-live legacy kitten to avoid mass de-listing them the moment this changes)?

**Files (once decided):** `server/src/utils/publishTargets.js`, possibly a one-time backfill script.

---

### Item 4 — `ContractReviewModal.jsx` hardcoded status badge
**Confirmed:** `client/src/components/admin/ContractReviewModal.jsx:44` — `<p className="text-sm font-semibold text-emerald-700">{contract.status}</p>` — always emerald-700 regardless of actual status.

`StatusBadge.jsx` (`client/src/components/admin/StatusBadge.jsx`) is kitten-status-specific (`'In Foster Care'`, `'Available for Adoption'`, etc.) — its exact key set doesn't apply to contract statuses (`DRAFT`/`SENT`/`SIGNED`/`VOID`), so I can't literally import and reuse that component as-is. I can reuse its **pattern** (a status→class lookup map). Better still, `client/src/pages/admin/ContractsPage.jsx:534-538` already has an established color convention for contract statuses I should match rather than invent new colors: SENT→amber, SIGNED→emerald, VOID→slate. I'll add DRAFT→a neutral/blue tone (not yet defined anywhere) as the one new color decision.

**Proposed fix:** new small `ContractStatusBadge.jsx` component (same pattern as `StatusBadge.jsx`, contract-specific status map, colors matching `ContractsPage.jsx`'s existing convention), used in `ContractReviewModal.jsx` in place of the hardcoded `<p>`.

**Files:** new `client/src/components/admin/ContractStatusBadge.jsx`, edit `client/src/components/admin/ContractReviewModal.jsx`
**Risk:** Low, purely cosmetic/display.

---

### Item 5 — Dead WISHLIST button on public kitten pages
**Confirmed still broken, now that the page is reachable again post-P0-fix.** `client/src/pages/public/PublicKittenProfile.jsx`:
- `wishlistRef` declared (line 73) but never attached to any element via `ref={wishlistRef}` anywhere in the file — the WISHLIST button's `onClick={() => scrollToRef(wishlistRef)}` (line 241) silently no-ops every time (`scrollToRef`'s `ref.current?.scrollIntoView(...)` — optional chaining swallows the null).
- `wishlists` state is fetched (`fetchPublicWishlists`, line 90, stored via `setWishlists` line 96) but never referenced anywhere else in the component — no wishlist section is rendered at all.

**Proposed fix:** add an actual wishlist section (list of retailer links using `WISHLIST_RETAILER_META`, already imported at line 7 but currently unused for rendering — only used for the type constant), attach `wishlistRef` to that section's container, matching the existing "About Me" / "Recent Updates" section pattern already in this file.

**Files:** `client/src/pages/public/PublicKittenProfile.jsx`
**Risk:** Low-medium — new user-facing section, worth a quick visual check after building since there's no existing section to copy pixel-for-pixel.

---

## Group B — Built but never confirmed live

### Item 6 — Status-confirmation modal wiring
**All three triggers are correctly wired in code; the "never observed firing" report likely has a real, different explanation — see Item 7.**

- Foster assignment (`FosterDetailPage.jsx:70-78`, modal render at line 261) — wired.
- End Placement (`FosterDetailPage.jsx:124-132`, same modal instance) — wired.
- Contract signing (`ContractsPage.jsx:232-239`, modal render at line 1006) — wired, **but gated**: `if (justSignedContract?.kittenId)` (line 232) — the modal only fires if the just-signed contract actually has a `kittenId` set.

This directly connects to Item 7: if a meaningful share of contract drafts are created via free-text kitten name entry without ever getting a real `kittenId` (which Item 7 confirms is possible), then signing those contracts will never trigger this modal — not because the modal is broken, but because its trigger condition correctly declines to fire for a contract with no linked kitten. Your one live QA pass not observing it may simply have been signing a contract that had no `kittenId`.

**Recommendation:** no fix needed here specifically — re-test after Item 7 ships, using a contract created through the picker (real `kittenId`), to confirm.

**Files:** none (no code change proposed for this item alone).

---

### Item 7 — Contract draft kitten field not linked to real record
**Root cause, confirmed.** `client/src/pages/admin/ContractsPage.jsx`: `draftForm.kittenName` is a plain free-text input (line ~690, `onChange={(e) => setDraftForm(prev => ({...prev, kittenName: e.target.value}))}`), completely independent of `draftForm.kittenId`, which only gets set by the picker's selection handler (line 453, `setDraftForm(prev => ({...prev, kittenId: kitten.id, kittenName: kitten.name}))`). Nothing stops staff from typing a kitten's name directly into the text field instead of using the picker — in which case `kittenId` stays at its default `null`, and the submitted payload sends `kittenId: draftForm.kittenId || undefined` (line 274), i.e. no link at all, even if a kitten with that exact name exists in the system. The picker itself works correctly when used; there's just no enforcement or fallback matching when it isn't.

**Proposed fix — needs your call on strictness:**
- **Option A (stricter):** once the picker returns search results, require selecting one — remove or disable manual free-text entry for kitten name, forcing `kittenId` to always be real. Risk: breaks the case where a contract is genuinely for a kitten not yet in the system (early intake).
- **Option B (softer):** keep free text allowed, but on submit, if `kittenId` is null and `kittenName` is non-empty, attempt a case-insensitive exact-name match against real kittens client-side (reusing the same search the picker already calls) and prompt staff to confirm/link before submitting, or auto-link on an unambiguous single match.

I'd lean toward B since it preserves the legitimate free-text case while closing the exact gap in your bug report, but this is a workflow decision, not a technical one.

**Files:** `client/src/pages/admin/ContractsPage.jsx`
**Risk:** Low-medium, contract data quality.

---

### Item 8 — Foster Portal (Persona 2) login UI
**Significant correction to the premise of this item: there is currently no foster portal login page in the frontend at all.**

Grepping `client/src/App.jsx`'s full route table (lines 56-109) for anything portal-related returns zero matches. The only authentication route registered anywhere in the client router is `/login` (`LoginPage.jsx`), which is exclusively the staff/admin login form — it has no awareness of foster portal accounts, no separate portal branch, nothing.

On the server, real portal infrastructure does exist: `server/src/controllers/portalAuthController.js` (has a `setPassword` handler), `server/src/routes/portalAuthRoutes.js` (a deliberately-unauthenticated `/set-password` endpoint consuming an invite token), `server/src/routes/portalRoutes.js`, and `server/src/services/fosterPortalAccountService.js` (provisions accounts when the "Also create a portal account" checkbox is used on `FosterListPage.jsx`). But there is no client-side page anywhere that would let a foster actually reach a login screen, or consume a "set your password" invite link.

**This means:** if you create a real test portal account and try to log in, there is currently nothing to navigate to — not a bug in an existing screen, but a missing screen entirely. I want to flag this clearly before you spend time on that test, since it changes what "review the actual portal login page" can mean right now.

This is squarely adjacent to items 17/18, which you've explicitly scoped out of this round as "real, substantial features." I'd suggest treating "build the foster portal login/set-password page" as part of that same future scope rather than folding it into this cleanup — but wanted to surface it now rather than let you discover it mid-test.

**Files:** none proposed here — flagging only, per your instruction to review, not build.

---

### Item 9 — Settings → Document Signature
**UI code is clean and correct; live value NOT confirmed (same DB access block as Item 2).**

`client/src/pages/admin/SettingsPage.jsx`: the upload handler (`handleOrgSignatureUpload`, ~line 297) reads the file as a base64 data URL and stores it via `handleOrgFieldChange('orgSignatureUrl', ...)`. The preview section (line 635) is directly conditional: `{orgSettings.orgSignatureUrl ? (<img src={orgSettings.orgSignatureUrl} .../> ...) : ...}` — if `orgSettings.orgSignatureUrl` is falsy, no preview renders, exactly matching what you saw. This code has no bug in it as written — the only question is whether the underlying `Settings.orgSignatureUrl` column actually holds a value or is genuinely empty.

I attempted the exact query you suggested (`prisma.settings.findUnique({ where: { id: 1 }, select: { orgSignatureUrl: true } })`) using the same script pattern as `query-contracts-28-34.mjs`, and hit the same environment block described in Item 2 (Windows-only Prisma engine, no live admin session available to me via the API either).

**Decision needed:** can you run this query yourself, or grant me a working path to it? Until then I can't tell you whether this is a correct empty state or a real persistence bug — the UI code alone can't answer that.

**Files:** none until the live value is known.

---

### Item 10 — `deleteDocument` multi-photo regeneration path
**Traced in full; structurally sound.** `server/src/controllers/documentController.js:219-274`. When the deleted document was the primary photo, it looks up the next-available photo document (ordered same as elsewhere via `photoDocumentOrderBy()`), and if one exists, generates a new thumbnail (`generateThumbnailFromUrl`) and — inside a single `$transaction` — clears every document's `isPrimaryPhoto` flag, sets the new one's flag and `docType`, and updates the kitten's `primaryPhotoUrl`/`thumbnailUrl` to match. If no replacement photo exists, it correctly nulls both fields instead. The transaction boundaries look correct and I didn't find a partial-write scenario.

The one piece I did not independently verify is `generateThumbnailFromUrl`'s own behavior on a real image (whether it throws cleanly on a bad/legacy `fileUrl` and how that propagates) — that's the actual "did this ever run against real data" question, and matches exactly what you flagged: this needs a live test, not further code tracing, to be fully confident.

**Files:** none proposed — recommend the live test you already offered, no code change appears needed based on the trace.

---

## Group C — Report only, no build

### Item 11 — S3/R2 provisioning
Confirmed still accurately logged as "waiting on you" (Task #100 in the running task list), not silently expected to be built this round. No new investigation needed; nothing changed since we last discussed it.

---

## Group D — Low-priority cleanup

### Item 13 — Delete 4 legacy QA test contracts (ids 28, 30, 32, 34)
**Cannot confirm with a fresh query — same DB access block as items 2 and 9.** The script that would do exactly this (`server/scripts/query-contracts-28-34.mjs`) already exists and is well-built (truncates large fields sensibly), but I can't execute it from this sandbox (Prisma client compiled for Windows only) and don't have a working admin session via the live API either.

**I will not propose a deletion plan without this confirmation** — per your own instruction ("confirm with a fresh query they're still exactly those 4 rows and nothing else before deleting anything"), and per my standing rule not to touch production data deletion without verified current state. Please either run `node -r dotenv/config server/scripts/query-contracts-28-34.mjs` yourself (from a machine where the Prisma client matches your OS) and share the output, or grant me a path to run it.

**Flag: this item touches production data deletion — sensitive regardless of confirmation status.**

---

### Item 14 — Remove dead legacy per-kitten wishlist fields
**Confirmed safe.** `server/prisma/schema.prisma:93-95` — `Kitten.amazonWishlistUrl`, `Kitten.walmartWishlistUrl`, `Kitten.chewyWishlistUrl` (all `String?`). Grepped the entire client for any reference to these on a kitten object — zero matches. The only client-side hits for these field names are `settings.amazonWishlistUrl` / `settings.chewyWishlistUrl` in `client/src/pages/public/DonatePage.jsx:124-125` — a **completely separate field on the `Settings` model** (`schema.prisma:633-634`, note: Settings has no `walmartWishlistUrl` at all), actively used for the "Other Ways to Give" links on the Donate page. These are two different fields on two different models that happen to share three names — confirmed the Kitten-model trio is the only one in scope here, and it's genuinely dead.

**Proposed fix (schema change, plan only per your standing rule):** remove the three fields from the `Kitten` model in `server/prisma/schema.prisma`, generate a migration. No client or controller code references them (superseded entirely by the real `Wishlist` table), so no other file changes are needed.

**Files:** `server/prisma/schema.prisma` (+ generated migration)
**Risk:** Low, but it's a schema change — flagging per standing rule, not applying.

---

### Item 15 — Hardcoded IP placeholder cleanup
**Correction to the item's own description: the file is wrong.** The original task-list entry (#33) says `api.js`; I re-read `client/src/services/api.js` in full earlier this session (for the apiCache timeout work) and confirmed `192.0.2.1` is **not** there anymore. The actual current location is `client/src/components/ContractSigningPad.jsx:91` — `const ipAddress = '192.0.2.1';` — sent as part of the sign payload.

**Confirmed genuinely inert**, matching your description: `server/src/controllers/contractController.js:393-406` has an explicit comment and implementation confirming the server never trusts a client-supplied IP — `const clientIp = getClientIp(req)` is used unconditionally for the persisted audit record (`ipAddress: clientIp`, both in the flat-field and the `signatureAudit`-smuggling-guard cases), regardless of what the client sent.

**Proposed fix:** remove the dead `ipAddress` field entirely from the client payload in `ContractSigningPad.jsx` (it's not read for anything real), or replace the literal with a comment noting the server ignores it if you'd rather keep the shape self-documenting. I'd lean toward removing it outright since it's actively misleading to read.

**Files:** `client/src/components/ContractSigningPad.jsx`
**Risk:** Zero — confirmed dead value, server-side behavior unaffected either way.

---

### Item 16 — Missing permission check on `createFosterPlacement`
**Confirmed exactly as described.** `server/src/routes/fosterRoutes.js:19` — `router.post('/:id/placements', createFosterPlacement);` has no middleware, while its sibling at line 20 — `router.post('/:id/placements/:placementId/discharge', requirePermission('fosters.manage'), dischargePlacement);` — does.

**Proposed fix:** add the identical guard: `router.post('/:id/placements', requirePermission('fosters.manage'), createFosterPlacement);`

**Aside, not in scope unless you want it added:** while reading this file I noticed several other routes in the same file also have no permission check at all — `GET /` (`getAllFosters`), `POST /` (`createFoster`), `GET /:id/placements` (`getFosterPlacements`), `GET /:id` (`getFosterById`). I'm not proposing changes to those since you scoped this item specifically to `createFosterPlacement`'s parity with its discharge sibling, but flagging the broader pattern in case it's worth a follow-up.

**Files:** `server/src/routes/fosterRoutes.js`
**Risk:** Low, additive guard matching an established sibling pattern. Touches auth — flagging per your sensitivity criteria even though the change itself is small and low-risk.

---

### Item 19 — Dead gallery endpoint (`GET /kittens/:id/photos`)
**My recommendation: delete it, not proxy-ify it.**

Confirmed unused client-side (`fetchPublicKittenPhotos` is exported from `publicApi.js` but never imported anywhere else in the client — this was independently re-confirmed by a fresh code-reviewer pass during the P0 photo-proxy work earlier this session). It does still return raw base64 in JSON (`server/src/controllers/publicController.js`, `getPublicKittenPhotos`), same payload-bloat class as the P0 bug — but on a route nothing calls.

Reasoning for delete over proxy-ify: applying the P0 photo-proxy pattern here would be meaningful, non-trivial work (the endpoint returns a *gallery* — multiple images per kitten — so it needs N proxy URLs, not one, plus its own resolution logic) spent on a code path with zero current callers and no confirmed near-term use. If a real photo gallery feature gets built later, it'll likely need reshaping anyway (pagination, ordering controls, etc.) — better to build it fresh against real requirements than preserve a shape nobody has validated. Deleting now also shrinks the payload-bloat surface area to zero rather than one.

**Proposed fix:** delete `getPublicKittenPhotos` from `publicController.js`, its route in `publicRoutes.js`, and the dead `fetchPublicKittenPhotos` export in `publicApi.js`.

**Files:** `server/src/controllers/publicController.js`, `server/src/routes/publicRoutes.js`, `client/src/services/publicApi.js`
**Risk:** Low — confirmed zero live callers.

---

## Consolidated file list (full blast radius if everything above is approved as proposed)

**Client:**
- `client/src/components/admin/KittenHealthTab.jsx` (Item 1)
- `client/src/pages/FosterListPage.jsx` (Item 2, if List page's count is the one that changes)
- `client/src/components/admin/ContractReviewModal.jsx` (Item 4)
- `client/src/components/admin/ContractStatusBadge.jsx` — **new file** (Item 4)
- `client/src/pages/public/PublicKittenProfile.jsx` (Item 5)
- `client/src/pages/admin/ContractsPage.jsx` (Item 7)
- `client/src/components/ContractSigningPad.jsx` (Item 15)
- `client/src/services/publicApi.js` (Item 19)

**Server:**
- `server/src/controllers/fosterController.js` (Item 2)
- `server/src/controllers/kittenController.js` (Item 2)
- `server/src/validations/kittenValidation.js` (Item 2)
- `server/src/utils/publishTargets.js` (Item 3 — pending your decision)
- `server/prisma/schema.prisma` (Item 14 — plan only, not applied)
- `server/src/routes/fosterRoutes.js` (Item 16)
- `server/src/controllers/publicController.js` (Item 19)
- `server/src/routes/publicRoutes.js` (Item 19)

**No file changes proposed:** Items 6, 8, 9, 10, 11, 13 (all report-only, blocked-on-confirmation, or "nothing to fix" findings).

## Open decisions before any code gets written
1. **Item 2:** which foster-kitten count is authoritative, and can you get me either real DB access or a working admin session so I can confirm live numbers first?
2. **Item 3:** should `publishTargets: []` mean public-by-default (current) or hidden-by-default (correct as access control, needs a backfill)?
3. **Item 7:** strict (force picker selection) or soft (free text + fuzzy-match confirmation) fix?
4. **Item 9 / Item 13:** same DB-access blocker as Item 2 — need either your own query output or a working access path.
5. **Item 16 aside:** want the other unguarded foster routes fixed too, or strictly `createFosterPlacement` only as scoped?

## Flagged as sensitive (auth, legal data, or production data deletion)
- **Item 2** — touches the generic kitten-update endpoint's writable fields.
- **Item 13** — production data deletion; blocked on live confirmation, will not proceed without it regardless of how this round is approved.
- **Item 15** — touches contract-signing payload (legal audit trail), though confirmed inert.
- **Item 16** — touches an auth/permission guard.

Everything else (Items 1, 4, 5, 14, 19, and Item 6/10's "no fix needed" findings) is low-risk, cosmetic, or dead-code cleanup.
