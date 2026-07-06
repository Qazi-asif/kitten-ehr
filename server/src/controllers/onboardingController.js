import prisma from '../lib/prisma.js';

const DEFAULT_CHECKLIST_STEPS = [
  { stepKey: 'application_review', label: 'Review application' },
  { stepKey: 'reference_check', label: 'Reference check completed' },
  { stepKey: 'home_check', label: 'Home check completed' },
  { stepKey: 'orientation', label: 'Foster orientation completed' },
  { stepKey: 'supply_kit', label: 'Supply kit provided' },
];

export async function getOnboardingList(_req, res, next) {
  try {
    const records = await prisma.fosterOnboarding.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        checklistItems: {
          orderBy: { id: 'asc' },
        },
      },
    });
    res.json(records);
  } catch (error) {
    next(error);
  }
}

export async function getOnboardingById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const record = await prisma.fosterOnboarding.findUnique({
      where: { id },
      include: {
        checklistItems: {
          orderBy: { id: 'asc' },
          include: {
            completedByUser: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!record) return res.status(404).json({ error: 'Foster onboarding record not found' });
    res.json(record);
  } catch (error) {
    next(error);
  }
}

export async function createOnboarding(req, res, next) {
  try {
    const { applicantName, applicantEmail, notes, status } = req.body;

    if (!applicantName?.trim()) return res.status(400).json({ error: 'applicantName is required' });
    if (!applicantEmail?.trim()) return res.status(400).json({ error: 'applicantEmail is required' });

    const record = await prisma.fosterOnboarding.create({
      data: {
        applicantName: applicantName.trim(),
        applicantEmail: applicantEmail.trim(),
        notes: notes?.trim() ?? '',
        status: status ?? 'APPLIED',
        checklistItems: {
          create: DEFAULT_CHECKLIST_STEPS,
        },
      },
      include: {
        checklistItems: { orderBy: { id: 'asc' } },
      },
    });

    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
}

export async function updateChecklistItem(req, res, next) {
  try {
    const onboardingId = Number.parseInt(req.params.onboardingId, 10);
    const itemId = Number.parseInt(req.params.itemId, 10);
    const { isComplete } = req.body;

    if (typeof isComplete !== 'boolean') {
      return res.status(400).json({ error: 'isComplete must be a boolean' });
    }

    const item = await prisma.onboardingChecklist.findFirst({
      where: { id: itemId, onboardingId },
    });

    if (!item) return res.status(404).json({ error: 'Checklist item not found' });

    const updated = await prisma.onboardingChecklist.update({
      where: { id: itemId },
      data: {
        isComplete,
        completedAt: isComplete ? new Date() : null,
        completedBy: isComplete ? req.user?.id ?? null : null,
      },
      include: {
        completedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Checklist item not found' });
    next(error);
  }
}
