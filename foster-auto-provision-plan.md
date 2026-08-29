# Plan: Auto-provision Foster + Portal Account on Application Approval

**Status:** Fully planned and approved by client. **Not built.** Held intentionally for a fresh session so it isn't rushed into a night that already shipped several other changes.

**Scope:** Foster-type applications only. Adoption applications are explicitly untouched by this entire feature.

---

## 1. What this does

Today, approving a Foster application (status → Approved) only sends a notification email. Creating the actual `Foster` record and the portal account is a fully separate manual step ("Add Foster" + check the portal-account box), done later by staff, disconnected from the approval action.

This feature closes that gap: when staff approve a Foster application, show a confirmation modal (not automatic) offering to create the `Foster` record and provision the portal account (same underlying `provisionFosterPortalAccount` logic already used by the manual "Add Foster" flow) in one step, pre-filled from the application's data.

---

## 2. Hook point (confirmed against actual code)

`updateApplicationStatus` in `server/src/controllers/applicationController.js` is the correct and only hook point — it's exactly where `statusChanged` is already computed and where the existing approval email (`sendApplicationStatusChangedEmail`) fires today. The new logic is a single added condition:

```js
if (statusChanged && application.status === 'Approved' && application.type === 'Foster') {
  // return enough info for the client to show the confirmation modal —
  // do NOT create the Foster record here automatically.
}
```

This sits alongside, not inside, the existing email-trigger logic. Nothing about the email or the Adoption path changes.

---

## 3. Field mapping (traced against `Foster` schema + `ApplicationForm.jsx`)

Clean 1:1 mappings:

| Foster field | Source |
|---|---|
| `name` | `formData.fullName` |
| `phone` | `formData.phone` |
| `email` | `formData.email` |
| `address` | `formData.address` |

Fields requiring translation or defaults (approved as follows):

| Foster field | Handling |
|---|---|
| `experienceLevel` | Translated from the application's free-text options via a fixed table (see §4). Editable in the confirmation modal before submit. |
| `capabilityFlags` | Best-effort keyword mapping from the application's `capacity[]` checkboxes (see §4). Editable in the confirmation modal. |
| `maxKittens` | Not collected on the application. Stays at schema default (`0`). Staff can edit in the modal or later. |
| `emergencyContact` | Not collected on the application (gathered later, at contract time). Stays blank (`''`). |
| `photoUrl` | No clean source (application photos are separate `ApplicationUpload` rows of the *home*, not a foster profile photo). Stays unset (`null`), same as the manual flow when staff doesn't attach one. |
| `notes` | Sourced from `formData.message` (the application's optional "Anything else we should know?" field). |
| `sourceApplicationId` | New field (§6) — set to `application.id` automatically, not shown as an editable modal field. |

Not mapped anywhere (application-only data, stay visible on the Application record, no Foster equivalent exists): `homeType`, `availability`, `isolationRoom`, `vehicleAccess`, `unexpectedStopPlan`, `ownOrRent`, `currentPets`.

## 4. Translation tables (approved)

**`experienceLevel`:**

| Application value | Foster `experienceLevel` |
|---|---|
| `None (first-time foster)` | `Beginner` |
| `Some (I've had cats of my own)` | `Beginner` |
| `Experienced (I've fostered before)` | `Intermediate` |
| `Advanced (comfortable with bottle babies / medical cases)` | `Advanced` |

**`capabilityFlags`** (best-effort keyword match against the application's `capacity[]` selections, comma-joined into the existing `CAPABILITY_FLAGS` vocabulary):

| Application capacity option (if selected) | Maps toward |
|---|---|
| `Neonate kittens (bottle-feeding every 2 to 4 hours)` | `bottle_babies` |
| `Special needs / medical cats` | `medical_cases` |
| *(no application option maps to `feral_tnr` — never auto-set)* | — |
| *(`large_capacity` is normally derived from `maxKittens`, which isn't collected — never auto-set)* | — |

Both translated fields are pre-filled but editable in the confirmation modal — staff corrects a bad guess before anything is created, per the "auto-fill is editable, not locked" pattern already used throughout Contracts.

---

## 5. Duplicate handling (approved)

`provisionFosterPortalAccount` already handles duplicate **portal accounts** cleanly (checks `User.email`, which has a real unique constraint, and catches `P2002` as a fallback) — that part is reused as-is.

But `Foster.email` has **no unique constraint**, and `createFoster` today has zero duplicate-Foster protection. So this new path needs its own explicit pre-check before creating anything:

```js
const existingFoster = await prisma.foster.findFirst({
  where: { email: { equals: applicantEmail, mode: 'insensitive' } },
});
```

- If **no** existing Foster: proceed with full Foster + portal-account creation as planned.
- If an existing Foster **is** found: do not create a duplicate Foster row. Instead, offer (in the same confirmation modal) to provision *only* the missing portal account against the existing Foster record, if it doesn't already have one — reusing `provisionFosterPortalAccount(existingFoster, req)` directly.

---

## 6. Schema change — diff only, NOT applied

Adds a traceability link from Foster back to the Application it was auto-created from (Foster currently has no such reference, unlike Contract which already has `applicationId`). Mirrors the existing `Contract.applicationId` relation pattern exactly for consistency.

```diff
 model Foster {
   id               Int         @id @default(autoincrement())
   name             String
   phone            String
   email            String
   address          String
   emergencyContact String      @default("")
   experienceLevel  String      @default("")
   capabilityFlags  String      @default("")
   maxKittens       Int         @default(0)
   photoUrl         String?
   notes            String      @default("")
   createdAt        DateTime    @default(now())
   currentKittens   Kitten[]    @relation("CurrentFoster")
   placements       Placement[]
   contracts        Contract[]
   portalUser       User?
   submittedDocuments Document[] @relation("DocumentSubmittedByFoster")
+  sourceApplicationId Int?
+  sourceApplication   Application? @relation(fields: [sourceApplicationId], references: [id], onDelete: SetNull)
 }
```

```diff
 model Application {
   id               Int                 @id @default(autoincrement())
   type             String
   status           String              @default("New")
   statusNotes      String              @default("")
   statusUpdatedAt  DateTime?
   kittenOfInterest String?
   formData         String              @default("{}")
   rejectionReason  String?
   rejectionNotes   String?
   rejectedById     Int?
   rejectedAt       DateTime?
   rejectedBy       User?               @relation("ApplicationRejectedBy", fields: [rejectedById], references: [id], onDelete: SetNull)
   createdAt        DateTime            @default(now())
   contracts        Contract[]
   uploads          ApplicationUpload[]
+  sourcedFosters   Foster[]

   @@index([rejectedById])
   @@index([status, createdAt])
 }
```

`onDelete: SetNull` matches every other optional FK in this schema (`Contract.kittenId`, `Contract.fosterId`, `Contract.applicationId`) — deleting an Application later never cascades into deleting or breaking the Foster record it produced.

This diff is written here for review only. It has not been applied to `schema.prisma`, and no migration has been generated or run.

---

## 7. Confirmation UX (approved: confirmation required, not automatic)

After staff save an Approved status change on a Foster-type application, show a modal (same family as `StatusConfirmationModal`, used today after contract signing):

- Pre-filled, editable fields: signer info (read-only, already correct), `experienceLevel` (translated, editable dropdown), `capabilityFlags` (translated, editable checkboxes), `maxKittens`/`emergencyContact`/`notes` (blank/defaulted, editable).
- If a duplicate Foster-by-email was found (§5): modal instead offers "Send portal invite to existing Foster record" as the primary action, with the existing Foster's current data shown read-only.
- Primary button: "Create Foster Record + Send Portal Invite."
- Secondary button: "Skip — I'll add this Foster manually later."
- Skipping does not undo the approval or its notification email — same non-blocking spirit as the existing kitten-status prompt.

---

## 8. Build checklist for the fresh session

1. Apply the schema diff in §6, generate and run the migration.
2. Backend: extend `updateApplicationStatus` to detect Foster-type Approved transitions and return the info the modal needs (mapped/translated field preview + duplicate-Foster check result) without creating anything yet.
3. Backend: new endpoint (or extend an existing one) to actually perform the confirmed creation — Foster + `provisionFosterPortalAccount`, or portal-account-only against an existing Foster, per §5 — only called when staff clicks the modal's primary button.
4. Backend: implement the `experienceLevel`/`capabilityFlags` translation tables from §4 as pure, testable helper functions (so the mapping logic isn't buried inline).
5. Frontend: new confirmation modal component, modeled on `StatusConfirmationModal`, wired into `ApplicationDetailPanel.jsx`'s approve flow.
6. Fresh re-read of every touched file, per standing project discipline.
7. Confirm live: approve a real Foster application, verify the modal appears with correctly-translated fields, verify Skip doesn't affect the approval, verify the duplicate-Foster path with a repeat applicant.

Nothing in this checklist has been started. This file is the full, retrievable record of everything approved tonight — safe to resume from cold in a new session.
