import prisma from '../lib/prisma.js';
import {
  createFosterSchema,
  updateFosterSchema,
  formatZodError,
  normalizeCapabilityFlags,
} from '../validations/fosterValidation.js';
import {
  provisionFosterPortalAccount,
  resendFosterPortalSetupLink,
} from '../services/fosterPortalAccountService.js';

// Computes the small portal-account summary attached to GET /:id - staff had
// no way to see whether a foster's portal account exists, is active, or has
// a pending/expired setup link until this was added (the only prior
// portal-account UI was a one-time notice shown right after foster
// creation). A pending SETUP/RESET token is "unused and not yet expired";
// everything else (used, expired) is not pending, so Resend is offered.
async function loadPortalAccountSummary(fosterId) {
  const user = await prisma.user.findUnique({
    where: { fosterId },
    select: {
      id: true,
      isActive: true,
      role: { select: { isPortalRole: true } },
      passwordResetTokens: {
        where: { usedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { expiresAt: true },
      },
    },
  });

  if (!user || !user.role.isPortalRole) {
    return { exists: false, isActive: false, hasPendingSetup: false, tokenExpiresAt: null };
  }

  const pendingToken = user.passwordResetTokens[0] || null;
  const hasPendingSetup = Boolean(pendingToken && pendingToken.expiresAt > new Date());

  return {
    exists: true,
    isActive: user.isActive,
    hasPendingSetup,
    tokenExpiresAt: pendingToken?.expiresAt ?? null,
  };
}

export async function getAllFosters(_req, res, next) {
  try {
    const [fosters, openPlacementCounts] = await Promise.all([
      prisma.foster.findMany({
        orderBy: { name: 'asc' },
        // Exclude photoUrl from list view — it can be a large base64 blob and
        // is only needed on the individual foster detail page.
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          experienceLevel: true,
          capabilityFlags: true,
          maxKittens: true,
          notes: true,
          isActive: true,
          createdAt: true,
          _count: { select: { placements: true } },
        },
      }),
      prisma.placement.groupBy({
        by: ['fosterId'],
        where: { dischargeDate: null },
        _count: { _all: true },
      }),
    ]);

    const openPlacementsByFosterId = new Map(
      openPlacementCounts.map((row) => [row.fosterId, row._count._all]),
    );

    const payload = fosters.map((foster) => ({
      ...foster,
      _count: {
        // Foster list capacity uses open placements — same source as FosterDetailPage.
        currentKittens: openPlacementsByFosterId.get(foster.id) ?? 0,
        placements: foster._count.placements,
      },
    }));

    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function createFoster(req, res, next) {
  try {
    const parsed = createFosterSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const data = parsed.data;
    const capabilityFlags = normalizeCapabilityFlags(data.capabilityFlags, data.maxKittens);
    // Not part of the Foster model, so read straight off req.body rather
    // than through createFosterSchema - keeps this flag's handling
    // independent of the Foster field-validation schema entirely.
    const createPortalAccount = Boolean(req.body.createPortalAccount);

    const foster = await prisma.foster.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        emergencyContact: data.emergencyContact,
        experienceLevel: data.experienceLevel,
        capabilityFlags,
        maxKittens: data.maxKittens,
        photoUrl: data.photoUrl || null,
        notes: data.notes,
      },
    });

    // Best-effort, separate from the Foster write above on purpose - a
    // problem provisioning the portal account (no portal role configured,
    // duplicate email) must never roll back or block the Foster record
    // that staff actually asked to create.
    let portalAccount = null;
    if (createPortalAccount) {
      portalAccount = await provisionFosterPortalAccount(foster, req);
    }

    res.status(201).json({ ...foster, portalAccount });
  } catch (error) {
    next(error);
  }
}

// Write path for the Foster-application approval auto-provision feature
// (see foster-auto-provision-plan.md). Called only when staff click the
// confirmation modal's primary button after reviewing/editing the mapped
// preview - updateApplicationStatus never calls this itself, it only
// returns the preview data. Mirrors createFoster's structure deliberately:
// the Foster write and the portal-account step are sequential and NOT
// wrapped in one transaction together, same reasoning as createFoster - a
// portal-account problem must never roll back or block the Foster record.
// The duplicate-Foster-by-email check is re-run here at write time rather
// than trusted from the earlier preview, since time may have passed between
// Approve and this confirm click (another staff member could have created
// the Foster manually in the meantime).
export async function provisionFosterFromApplication(req, res, next) {
  try {
    const applicationId = Number.parseInt(req.params.applicationId, 10);
    if (!Number.isInteger(applicationId)) {
      return res.status(400).json({ error: 'A valid applicationId is required' });
    }

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (application.type !== 'Foster') {
      return res.status(400).json({ error: 'This action is only available for Foster-type applications' });
    }

    const parsed = createFosterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const data = parsed.data;
    const createPortalAccount = Boolean(req.body.createPortalAccount);
    const email = data.email.trim().toLowerCase();

    const existingFoster = await prisma.foster.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    let foster;
    let fosterWasExisting;

    if (existingFoster) {
      // Do not create a duplicate Foster row - reuse the existing record
      // as-is. sourceApplicationId is intentionally left untouched here:
      // this application did not originate that Foster's creation, so
      // rewriting its provenance would be misleading.
      foster = existingFoster;
      fosterWasExisting = true;
    } else {
      const capabilityFlags = normalizeCapabilityFlags(data.capabilityFlags, data.maxKittens);
      foster = await prisma.foster.create({
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          emergencyContact: data.emergencyContact,
          experienceLevel: data.experienceLevel,
          capabilityFlags,
          maxKittens: data.maxKittens,
          photoUrl: data.photoUrl || null,
          notes: data.notes,
          sourceApplicationId: applicationId,
        },
      });
      fosterWasExisting = false;
    }

    // Best-effort, separate from the Foster write above on purpose - same
    // non-blocking contract as createFoster. provisionFosterPortalAccount
    // is reused completely unmodified; it never throws, always returns
    // { ok, reason } or { ok, userId }.
    let portalAccount = null;
    if (createPortalAccount) {
      if (fosterWasExisting) {
        const existingPortalUser = await prisma.user.findFirst({ where: { fosterId: foster.id } });
        portalAccount = existingPortalUser
          ? { ok: false, reason: 'A portal account already exists for this foster.' }
          : await provisionFosterPortalAccount(foster, req);
      } else {
        portalAccount = await provisionFosterPortalAccount(foster, req);
      }
    }

    // CR-80: ensure an Onboarding tab row exists for newly approved fosters.
    let onboarding = null;
    try {
      const existingOnboarding = await prisma.fosterOnboarding.findFirst({
        where: { applicantEmail: { equals: email, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
      });
      if (existingOnboarding) {
        onboarding = existingOnboarding;
      } else {
        onboarding = await prisma.fosterOnboarding.create({
          data: {
            applicantName: foster.name,
            applicantEmail: email,
            notes: `Auto-created from foster application #${applicationId}`,
            status: 'APPLIED',
            checklistItems: {
              create: [
                { stepKey: 'application_review', label: 'Review application' },
                { stepKey: 'reference_check', label: 'Reference check completed' },
                { stepKey: 'home_check', label: 'Home check completed' },
                { stepKey: 'orientation', label: 'Foster orientation completed' },
                { stepKey: 'supply_kit', label: 'Supply kit provided' },
              ],
            },
          },
          include: { checklistItems: true },
        });
      }
    } catch (onboardingError) {
      console.error('[provisionFoster] onboarding create failed:', onboardingError?.message || onboardingError);
    }

    res.status(fosterWasExisting ? 200 : 201).json({
      foster,
      fosterWasExisting,
      portalAccount,
      onboarding,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFosterById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const foster = await prisma.foster.findUnique({
      where: { id },
      include: {
        currentKittens: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            name: true,
            status: true,
            breed: true,
            color: true,
          },
        },
        _count: { select: { placements: true, currentKittens: true } },
      },
    });

    if (!foster) {
      return res.status(404).json({ error: 'Foster not found' });
    }

    const portalAccount = await loadPortalAccountSummary(id);

    res.json({ ...foster, portalAccount });
  } catch (error) {
    next(error);
  }
}

export async function updateFoster(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const parsed = updateFosterSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const existing = await prisma.foster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Foster not found' });
    }

    const data = parsed.data;
    const updateData = { ...data };

    if (data.capabilityFlags !== undefined || data.maxKittens !== undefined) {
      updateData.capabilityFlags = normalizeCapabilityFlags(
        data.capabilityFlags ?? existing.capabilityFlags,
        data.maxKittens ?? existing.maxKittens,
      );
    }
    if (data.photoUrl !== undefined) {
      updateData.photoUrl = data.photoUrl || null;
    }

    const foster = await prisma.foster.update({
      where: { id },
      data: updateData,
    });

    res.json(foster);
  } catch (error) {
    next(error);
  }
}

// Soft-deactivate only - fosters are never hard-deleted, since their
// placement/contract history must remain intact. Staff can still view
// deactivated fosters; they're just flagged as no longer active for new
// placements.
export async function deactivateFoster(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const existing = await prisma.foster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Foster not found' });
    }

    const foster = await prisma.foster.update({
      where: { id },
      data: { isActive: false },
    });

    res.json(foster);
  } catch (error) {
    next(error);
  }
}

/** Hard-delete for QA / mistaken records (CR-78). Cleared after confirming no blockers. */
export async function deleteFoster(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.foster.findUnique({
      where: { id },
      include: {
        _count: { select: { placements: true, currentKittens: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: 'Foster not found' });

    await prisma.$transaction(async (tx) => {
      await tx.kitten.updateMany({
        where: { currentFosterId: id },
        data: { currentFosterId: null },
      });
      await tx.placement.deleteMany({ where: { fosterId: id } });
      await tx.wishlist.deleteMany({
        where: { ownerType: 'FOSTER', ownerId: id },
      });
      await tx.user.updateMany({
        where: { fosterId: id },
        data: { fosterId: null, isActive: false },
      });
      await tx.foster.delete({ where: { id } });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function resendPortalSetupLink(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const foster = await prisma.foster.findUnique({ where: { id } });
    if (!foster) {
      return res.status(404).json({ error: 'Foster not found' });
    }

    const result = await resendFosterPortalSetupLink(foster, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
