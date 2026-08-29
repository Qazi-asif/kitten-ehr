# Plan: Kitten Outcome Record

**Status:** Investigated and scoped, revised after the QA pass to reflect a more specific, correct requirement. **Not built.** Held intentionally for a fresh session.

**Scope:** A simple outcome/discharge record on the kitten's own profile. Distinct from `Placement.dischargeDate`/`dischargeType` (tracks one specific foster placement ending, already shipped as "End Placement"). This is the kitten's own final record, independent of any specific placement.

**Revision note:** the original version of this plan proposed one shared `outcomeDate` + one shared `outcomeType` enum field, uniform across every outcome. The QA pass surfaced a more specific requirement that changes the design: **different field types per status** (a date for some outcomes, free text for one), plus a new status value ("Released") that didn't exist when this plan was first written. This revision reflects that — see §3 for what changed and why.

---

## 1. What this does

`Kitten.status` (In Foster Care / Available for Adoption / Adopted / Medical Hold / Transferred / Deceased — **soon 7 values, see §2**) is currently the only outcome-adjacent field on a kitten — a status enum with no date and no detail about the outcome itself. Staff have no way to record *when* a kitten's story ended or any detail beyond the bare status label.

This feature adds two small fields to the kitten profile, interpreted based on the kitten's current status:
- An **outcome date** — used when status is Adopted, Deceased, or Released.
- An **outcome detail** (free text) — used when status is Transferred (e.g. "Transferred to Riverside County Animal Shelter").

---

## 2. New status: "Released" — confirmed additive, not a replacement

Per the client's own wording ("Released (date — a NEW status not currently in the system)"), this reads as an 8th... **7th** additive status, not a replacement of any existing value. `KITTEN_STATUSES` needs to grow from 6 to 7 values in **both** places it's defined (kept in sync per the existing code comment):

- `server/src/validations/kittenValidation.js` — `KITTEN_STATUSES` array (feeds the Zod enum used by both `createKittenSchema` and `updateKittenSchema`).
- `client/src/constants/kittenStatuses.js` — `KITTEN_STATUS_OPTIONS` array (feeds every status `<select>` across the admin UI — `KittenForm.jsx`, `KittenDetailPanel.jsx`, and the admin kitten-list status filter).

Worth a one-line confirmation with the client before building, not assumed: "Released" could colloquially overlap with "Transferred" in meaning (e.g. "released to another rescue" vs. "transferred to another rescue"). If the client confirms the literal reading (additive, distinct concept — e.g. released back to a colony/TNR situation vs. transferred to another org), proceed as planned.

---

## 3. Schema design — revised, and simpler than the original plan

**What changed from the original plan:** the original `outcomeType` field was meant to be a separate enum classifying *which* outcome occurred (Adopted/Transferred/Deceased/etc.), duplicating information `Kitten.status` already carries. Once "Released" is added to `status` (§2), **`status` itself is already the classifier** — a separate `outcomeType` enum would just be redundant with it. The real, more specific need surfaced by the QA pass isn't "what kind of outcome" (status already answers that) but "what shape of *value* accompanies each outcome" — and that differs by status: a date for three of them, free text for one.

Revised schema — **two new nullable `Kitten` columns**, doing different jobs than the original plan's pair:

```prisma
outcomeDate   DateTime?
outcomeDetail String?
```

- `outcomeDate` — populated when `status` is **Adopted**, **Deceased**, or **Released**.
- `outcomeDetail` — populated when `status` is **Transferred** (free text — "Transferred to \_\_\_", not a controlled enum, per the client's own request for this one to be text).
- For every other status (In Foster Care, Available for Adoption, Medical Hold), both stay `null` — there's no outcome yet.

Nullable, no default — safe additive change, same pattern as tonight's `Application.kittenStatusAtSubmission` and `Kitten.intakeDate` additions. Apply via `npx prisma db push` (not `migrate dev` — this DB has known drift against migration history, confirmed earlier this project; `db push` is the established safe path).

This also **resolves one of the three open questions from the original plan** (§4 below) automatically: yes, the outcome fields are now directly tied to `status` by design — setting status to a terminal value is what determines which field (if either) is relevant, rather than the two being independent and free to drift apart. That's no longer an open question; it falls out of the revised design.

---

## 4. Still-open questions — genuinely unresolved, need the client before building

1. **Reversibility.** Does an outcome record need to be editable/clearable after the fact — e.g. a kitten marked "Adopted" (with `outcomeDate` set) whose adoption falls through and status reverts to "Available for Adoption"? Does `outcomeDate`/`outcomeDetail` get cleared automatically in that case, or does it stay as historical record even after `status` moves away from the terminal value? Not addressed by the QA item's wording — needs a direct answer, not a guess.
2. **"Released" vs. "Transferred" overlap** — flagged in §2. Needs a one-line client confirmation that these are meant to be distinct.

---

## 5. Build checklist for the fresh session

1. Confirm §4's two open questions with the client.
2. Add "Released" to `KITTEN_STATUSES` (server) and `KITTEN_STATUS_OPTIONS` (client) — kept in sync, per §2.
3. Add `outcomeDate`/`outcomeDetail` to `schema.prisma`, apply via `db push` (confirm no drift/data-loss warning, same discipline as every schema step this project).
4. Add both fields to `updateKittenSchema` (`server/src/validations/kittenValidation.js`) — `outcomeDate` as `optionalDate` (existing pattern already used for `dateOfBirth`/`intakeDate`), `outcomeDetail` as a plain optional string (intentionally free text, per the client's own request — no enum needed here, unlike the original plan's `outcomeType`).
5. Wire both fields into `updateKitten` (`server/src/controllers/kittenController.js`) — straight pass-through like `intakeDate`. Decide based on §4 Q1 whether changing `status` away from a terminal value should also clear the now-stale outcome field, or leave it as history.
6. Add a small, status-conditional section to the kitten profile edit form (`client/src/components/admin/KittenDetailPanel.jsx`): show a date input when `profileForm.status` is Adopted/Deceased/Released, show a text input when it's Transferred, show neither otherwise. Mirrors the `intakeDate`/`sex` conditional-field patterns already fixed this project.
7. Fresh re-read of every touched file, per standing project discipline.
8. Confirm live: set each of the four terminal statuses on a real kitten in turn, verify the correct field type appears and persists, verify reverting status behaves per §4 Q1's answer.

Nothing in this checklist has been started. This file is the full, retrievable record of what's been scoped — safe to resume from cold in a new session.
