# Kitten-EHR — Full System Workflow Audit

Read-only diagnosis. No code changed. Traced as user journeys through actual code paths (routes → controllers → schema → client pages), not just isolated file reads.

**Ranking key**
- **BROKEN** — something doesn't work as intended.
- **DISCONNECTED** — both sides work individually, but there's no link, hand-off, or automatic sync between them.
- **CONFUSING** — works and connects, but the UX or data model would confuse a non-technical staff member.
- **CLEAN** — confirmed working end-to-end, nothing to flag.

---

## Summary table

| # | Finding | Rank |
|---|---|---|
| 1 | Signing an adoption contract never updates the kitten's status | DISCONNECTED |
| 2 | Kitten's public "Meet Me" page 404s entirely once status leaves "Available for Adoption" | CONFUSING |
| 3 | Kitten profile has no view of contracts/agreements tied to that kitten | DISCONNECTED |
| 4 | Approved application has no "Create Contract" next step | DISCONNECTED |
| 5 | Legacy per-kitten wishlist fields on the Kitten model are dead code | CONFUSING |
| 6 | `deleteDocument` doesn't regenerate `thumbnailUrl` (#23) | BROKEN (narrow) |
| 7 | Hardcoded `192.0.2.1` IP placeholder on signing pad (#33) | CONFUSING (inert) |
| 8 | "Failed to load wishlists" error (investigated separately) | Isolated, not a chain-blocker |
| 9 | SMTP `emailsEnabled` (investigated separately) | Resolved |
| 10 | Foster ↔ kitten assignment | CLEAN |
| 11 | Contract picker/auto-fill from approved applications/fosters | CLEAN (user-confirmed) |
| 12 | Contract → PDF → email → person-record visibility (Foster/Application side) | CLEAN |
| 13 | Org logo / org signature / SMTP settings wiring | CLEAN |
| 14 | Public donation flow (Givebutter) | CLEAN (untouched this session) |

---

## 1. Kitten lifecycle

**Intake → profile → foster assignment**: clean. `createKitten`/`updateKitten` persist the full field set; `KittenDetailPanel` reads photo, medical, and protocol data correctly (CR-23 and CR-28 fixes from the earlier QA round are still in place and unaffected by this session's work — nothing this session touched kitten intake, photos, or protocols).

**Foster assignment**: clean, two-way. `Kitten.currentFosterId` is set via the kitten update endpoint, and `FosterDetailPage` independently fetches kittens and placements, so a foster's page shows their assigned kittens and a kitten's record shows its current foster. No dead-end.

**Public listing → adoption/return — DISCONNECTED.** This is the biggest structural gap in the kitten lifecycle. Kitten `status` is a free-text field set manually through a dropdown in the kitten edit form (`KittenForm.jsx`: In Foster Care / Available for Adoption / Adopted / Medical Hold / Transferred / Deceased). Nothing in the contract-signing flow touches it — `markContractSigned` never writes to the `Kitten` table. So marking an adoption contract SIGNED and marking a kitten's status "Adopted" are two completely separate manual actions with no link between them. A staff member can sign an adoption contract and forget to flip the kitten's status; the kitten will keep showing as "Available for Adoption" on the public site indefinitely.

**Compounding finding — CONFUSING.** The public "available kittens" filter (`buildPublicAvailableKittenWhereClause`: `status: 'Available for Adoption'` + website publish target) is reused for *every* public kitten endpoint, not just the listing grid — it also gates the individual kitten's own "Meet Me" profile page, its photo gallery, and its update feed (all built in CR-31). The practical effect: the moment staff correctly mark a kitten "Adopted," that kitten's entire public page 404s — including any updates or photos already posted, and any link to it shared on social media or given to the adopter. This may be an intentional "don't advertise unavailable cats" choice, but it's worth a deliberate decision rather than a byproduct of reusing one filter for two different purposes (availability vs. page existence).

**Orphaned fields — CONFUSING.** The `Kitten` model still has `amazonWishlistUrl` / `walmartWishlistUrl` / `chewyWishlistUrl` columns, and the server still validates and writes them via `updateKitten`. But there is no client UI anywhere that sets them, and nothing reads them back — the real, working per-kitten wishlist system is the newer generic `Wishlist` table (CR-25), which is correctly wired end-to-end (`WishlistManager` in the admin panel → `getKittenWishlists`/`getPublicKittenWishlists` → `PublicKittenProfile`). The old inline fields are pure dead schema left over from before CR-25, harmless but confusing if anyone goes looking for "the" wishlist field on a kitten record.

---

## 2. Foster journey

Application → approval → foster record → kitten assignment: clean, confirmed by both code read and your own live testing.

**Contract draft picker — CLEAN, user-confirmed.** `ContractsPage`'s draft form fetches `fetchFosters()` for Foster-type drafts and correctly auto-fills signer fields, matching what you tested and confirmed in task #42.

**Approved application → contract draft — DISCONNECTED.** The picker itself works once you're on the Contracts page and search for the right foster or applicant. But there is no signposted next step *from* an approved application. `ApplicationDetailPanel` shows a read-only list of existing agreements for that person (via `PersonContractsSection`) but has no "Create Contract" button or deep link that pre-selects that application in the draft form. Staff have to remember to navigate to Contracts, open "Create Draft," and manually search by name — a real but invisible manual hand-off.

**Signing (main + household acknowledgments) → PDF/email — CLEAN.** Verified this session with mock harnesses: household acknowledgments only appear for Foster contracts, save independently of the main signing transaction, and never block signing on failure. PDF/email generation is similarly fault-isolated.

**Ongoing care (protocols, updates) — CLEAN**, unaffected by this session's work; CR-27/CR-28 fixes from the earlier round are intact.

**Placement end — DISCONNECTED**, same root cause as the kitten lifecycle finding above: there's no automatic link between "foster placement ends" and any contract or kitten-status change. This is a manual, multi-step process today with no cross-referencing prompts.

---

## 3. Adoption journey

Application → approval → contract draft → signing → PDF/email: same picker/signing/PDF mechanics as the Foster journey, all clean and confirmed.

**Post-adoption status update — DISCONNECTED**, same finding as kitten lifecycle #1 above: signing an Adoption contract does not update `Kitten.status` or remove the kitten from public listings. This is worth calling out twice because it's the single most consequential gap for day-to-day use — it's the one place where "the contract system" and "the kitten system" should obviously talk to each other and currently don't at all.

---

## 4. Contract system (draft → signing → frozen text/PDF/email → history)

**Draft creation, all three template types — CLEAN**, user-confirmed across #42–#45.

**Frozen text/PDF/email — CLEAN.** `buildContractAgreementText` freezes the template at signing time; `frozenAgreementText` is what's shown afterward, not a live re-render, so later template edits don't retroactively change signed contracts. PDF generation embeds the logo, the signer's signature, and (as of this session) the org's authorized-representative signature and date, all verified with real pdf-lib output. Signed-PDF email is a separate, explicit action (#31), also fault-isolated from signing itself.

**History/visibility — split result:**
- **Foster and Application records — CLEAN.** `PersonContractsSection` surfaces every contract matched by `signerEmail`, with a working `View` link that deep-links into `ContractsPage` via a `?view=<id>` query param it already listens for.
- **Kitten records — DISCONNECTED.** `KittenDetailPanel.jsx` has zero reference to contracts anywhere. Even though every contract carries `kittenId`/`kittenName`, there's no way to look at a specific kitten's page and see "this kitten has a signed adoption agreement on file" — you'd have to go to the Contracts page and search by kitten name manually. Given `PersonContractsSection` already exists and does exactly this pattern for people, this is a straightforward gap rather than a hard problem — it's just not been added to the kitten side.

**Orphaned fields check — clean.** Every field captured in this session's build (`emergencyContactName/Phone`, household acknowledgments, `orgSignatureUrl`) is both written and displayed somewhere: emergency contact renders in the Foster template body text (once you paste it in), household acknowledgments are persisted and included in the contract's `CONTRACT_INCLUDE` query (so they're available to any view that wants them, though no admin UI currently lists them out individually — see below), and the org signature renders in the PDF.

**Minor gap — CONFUSING.** Household acknowledgment signatures are captured and stored (`ContractHouseholdAcknowledgment`, included in every contract fetch), but there's no dedicated place in the admin UI (`ContractViewModal` or otherwise) that explicitly displays "2 household members also signed: [name], [name]" — the data exists and is in the PDF, but isn't surfaced back in the app's own contract-review UI. Not broken, just a display gap for something that was clearly meant to be reviewable.

---

## 5. Settings dependencies

**Org logo → PDF header — CLEAN.** Wired since CR-32/#32, unaffected this session.

**Org signature → PDF second signature block — CLEAN**, built and empirically verified this session (both a real pdf-lib run and a mock-harness wiring test, both passing).

**SMTP config → email sending — CLEAN.** `emailsEnabled` is read fresh from the DB on every send attempt, no caching; the earlier "script sets it but server doesn't see it" mystery was almost certainly a `DATABASE_URL` mismatch between a one-off script and the running server, not a code defect, and it's moot now that the flag is set through the same UI/API path the app already reads.

**Non-technical discoverability — CLEAN.** All three (logo, signature, SMTP) live under Settings → Organization, each in its own clearly labeled card with a description sentence, file-picker with live preview and a remove button (logo/signature), or labeled text fields (SMTP), consistent with each other. An admin without technical background can find and set all three without external help — this was a deliberate design goal met in tasks #45 and the earlier SMTP UI work.

---

## 6. Public site

**Donation flow (Givebutter) — CLEAN, untouched this session.** Nothing in this session's work touched `DonatePage.jsx` or payment settings; CR-32's Givebutter-only change from the earlier QA round stands as-is. No regression risk identified since there's no code path connecting contract/signature work to the donation flow.

**Kitten public pages (sponsor panel, wishlist) — CLEAN**, with the caveat noted in Section 1: these pages depend on the kitten's `status` remaining "Available for Adoption," so they'll correctly disappear the moment a kitten's status changes — which is fine, but ties back to the same manual-status-flip gap.

**Foster/adopt applications — CLEAN**, confirmed connected to the admin-side application review/approval flow; nothing in this session touched `ApplicationForm.jsx` or the application submission pipeline.

---

## 7. Known open items — are they blocking anything?

- **"Failed to load wishlists" error** — investigated separately this session. Routing, permissions, and schema all check out in code; the error handler's own Prisma-schema-drift hint is the most likely explanation (a DB sync issue, not an app bug). This is isolated to the wishlist feature itself — it does not block or interact with any of the kitten/foster/adoption/contract journeys above.
- **SMTP configuration status** — resolved (see Section 5). Not a blocker.
- **CR-25 (per-kitten wishlist) live status** — the *real* system (generic `Wishlist` table) is fully wired end-to-end and working. The only issue is the dead legacy fields noted in Section 1 — cosmetic, not a blocker.
- **`deleteDocument` thumbnail staleness (#23)** — root cause now confirmed precisely: deleting a kitten's *primary* photo promotes the next photo and updates `primaryPhotoUrl`, but never regenerates `thumbnailUrl`. In the common case (another photo exists to promote) this doesn't visibly break anything, because `KittenListPage` only falls back to `thumbnailUrl` when `primaryPhotoUrl` is empty. But if a kitten's *last remaining* photo is deleted, `primaryPhotoUrl` correctly goes to `null` — and the list view then falls back to the now-stale `thumbnailUrl`, which still points at the deleted file, producing a broken image icon in the admin kitten list. Narrow (single-photo-kitten edge case) but a real, reproducible bug — ranking this **BROKEN**, not just cosmetic.
- **Hardcoded `192.0.2.1` (#33)** — confirmed inert. The client sends this placeholder as part of a draft `signatureAudit` object, but the server always overwrites `ipAddress` with the real, server-captured IP before persisting (`{ ...signatureAudit, ipAddress: clientIp }` — the real value comes last in the object spread and wins). So no contract has ever actually stored the fake IP; this is leftover placeholder code with zero effect on stored data. Confusing to read, not a bug.

---

## What would confuse a non-technical staff member day-to-day, ranked by how often they'd hit it

1. Signing an adoption (or ending a foster placement) and not being told anywhere in the UI that they also need to go update the kitten's status — this is the one every single adoption will hit.
2. Landing on a kitten's page in the admin panel and not seeing its signed contract there, even though it's one click away for the same kitten's foster/adopter record.
3. Reviewing an approved application and not seeing an obvious "create the contract now" action.
4. A kitten's public profile silently disappearing (404) the moment it's marked Adopted, if that page was ever shared externally.
