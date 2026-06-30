import prisma from '../lib/prisma.js';
import {
  createApplicationSchema,
  extractKittenOfInterest,
  formatZodError,
} from '../validations/applicationValidation.js';
import { sendApplicationReceivedEmails, sendApplicationStatusChangedEmail } from '../services/emailService.js';
import { APPLICATION_REVIEW_STATUSES } from '../constants/emailTemplates.js';

const VALID_STATUSES = ['New', 'Under Review', 'Approved', 'Denied'];

export async function getApplications(req, res, next) {
  try {
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

    sendApplicationReceivedEmails(application).catch((error) => {
      console.error('Application email trigger failed:', error.message);
    });

    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationStatus(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { status, statusNotes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const existing = await prisma.application.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    const statusChanged = existing.status !== status;
    const normalizedNotes = typeof statusNotes === 'string' ? statusNotes.trim() : existing.statusNotes;

    const application = await prisma.application.update({
      where: { id },
      data: {
        status,
        statusNotes: normalizedNotes,
        statusUpdatedAt: statusChanged ? new Date() : existing.statusUpdatedAt,
      },
    });

    if (statusChanged && APPLICATION_REVIEW_STATUSES.includes(application.status)) {
      sendApplicationStatusChangedEmail(application, normalizedNotes).catch((error) => {
        console.error('Application status email trigger failed:', error.message);
      });
    }

    res.json(application);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Application not found' });
    }
    next(error);
  }
}
