import prisma from '../lib/prisma.js';
import {
  createFosterSchema,
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
        orderBy: { id: 'asc' },
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
