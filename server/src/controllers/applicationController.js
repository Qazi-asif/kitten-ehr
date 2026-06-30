import prisma from '../lib/prisma.js';
import {
  createApplicationSchema,
  extractKittenOfInterest,
  formatZodError,
} from '../validations/applicationValidation.js';

export async function getApplications(req, res, next) {  try {
    const { status } = req.query;
    const applications = await prisma.application.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (error) {
    next(error);
  }
}

export async function createApplication(req, res, next) {
  try {
    const parsed = createApplicationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const { type, formData, kittenOfInterest } = parsed.data;
    const serializedFormData = typeof formData === 'string' ? formData : JSON.stringify(formData);
    const resolvedKittenOfInterest = extractKittenOfInterest(formData, kittenOfInterest);

    const application = await prisma.application.create({
      data: {
        type,
        formData: serializedFormData,
        kittenOfInterest: resolvedKittenOfInterest,
      },
    });
    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationStatus(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const application = await prisma.application.update({
      where: { id },
      data: { status },
    });

    res.json(application);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Application not found' });
    }
    next(error);
  }
}
