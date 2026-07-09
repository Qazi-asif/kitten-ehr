import prisma from '../lib/prisma.js';
import {
  createApplicationSchema,
  extractKittenOfInterest,
  formatZodError,
} from '../validations/applicationValidation.js';
import { sendApplicationReceivedEmails, sendApplicationStatusChangedEmail } from '../services/emailService.js';
import { APPLICATION_REVIEW_STATUSES } from '../constants/emailTemplates.js';
import { validateUploadedFile } from '../utils/fileValidation.js';

const VALID_STATUSES = ['New', 'Under Review', 'Approved', 'Denied'];
const MAX_APPLICATION_PHOTOS = 3;

const applicationListInclude = {
  uploads: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fileName: true,
      docLabel: true,
      fileType: true,
      createdAt: true,
    },
  },
  rejectedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
};

const applicationDetailInclude = {
  uploads: { orderBy: { createdAt: 'asc' } },
  rejectedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
};

function fileToDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

async function saveApplicationUploads(applicationId, files = []) {
  const uploads = [];

  for (const file of files.slice(0, MAX_APPLICATION_PHOTOS)) {
    const fileCheck = validateUploadedFile(file);
    if (!fileCheck.ok) {
      throw Object.assign(new Error(fileCheck.error), { status: fileCheck.status });
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw Object.assign(new Error('Only image uploads are allowed for application photos.'), { status: 400 });
    }

    uploads.push(
      prisma.applicationUpload.create({
        data: {
          applicationId,
          fileName: file.originalname || 'upload',
          docLabel: 'Applicant Photo',
          fileUrl: fileToDataUrl(file),
          fileType: file.mimetype,
        },
      }),
    );
  }

  if (uploads.length === 0) return [];
  return Promise.all(uploads);
}

export async function getApplications(req, res, next) {
  try {
    const { status } = req.query;
    const applications = await prisma.application.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: applicationListInclude,
    });
    res.json(applications);
  } catch (error) {
    next(error);
  }
}

export async function getApplicationById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const application = await prisma.application.findUnique({
      where: { id },
      include: applicationDetailInclude,
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
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
    const photoFiles = Array.isArray(req.files) ? req.files : [];

    if (photoFiles.length > MAX_APPLICATION_PHOTOS) {
      return res.status(400).json({ error: `Maximum ${MAX_APPLICATION_PHOTOS} photos allowed.` });
    }

    const application = await prisma.application.create({
      data: {
        type,
        formData: serializedFormData,
        kittenOfInterest: resolvedKittenOfInterest,
      },
    });

    let uploads = [];
    if (photoFiles.length > 0) {
      try {
        uploads = await saveApplicationUploads(application.id, photoFiles);
      } catch (uploadError) {
        await prisma.application.delete({ where: { id: application.id } }).catch(() => {});
        return res.status(uploadError.status || 400).json({ error: uploadError.message });
      }
    }

    sendApplicationReceivedEmails(application).catch((error) => {
      console.error('Application email trigger failed:', error.message);
    });

    res.status(201).json({ ...application, uploads });
  } catch (error) {
    next(error);
  }
}

export async function updateApplicationStatus(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { status, statusNotes, rejectionReason, rejectionNotes } = req.body;

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
    const updateData = {
      status,
      statusNotes: normalizedNotes,
      statusUpdatedAt: statusChanged ? new Date() : existing.statusUpdatedAt,
    };

    if (status === 'Denied') {
      updateData.rejectionReason = typeof rejectionReason === 'string' ? rejectionReason.trim() : existing.rejectionReason;
      updateData.rejectionNotes = typeof rejectionNotes === 'string'
        ? rejectionNotes.trim()
        : normalizedNotes || existing.rejectionNotes;
      updateData.rejectedById = req.user?.id ?? null;
      updateData.rejectedAt = statusChanged ? new Date() : existing.rejectedAt;
    }

    const application = await prisma.application.update({
      where: { id },
      data: updateData,
      include: applicationDetailInclude,
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

export async function uploadApplicationDocument(req, res, next) {
  try {
    const applicationId = Number.parseInt(req.params.id, 10);
    const fileCheck = validateUploadedFile(req.file);
    if (!fileCheck.ok) {
      return res.status(fileCheck.status).json({ error: fileCheck.error });
    }

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const docLabel = typeof req.body.docLabel === 'string' ? req.body.docLabel.trim() : '';
    if (!docLabel) {
      return res.status(400).json({ error: 'docLabel is required' });
    }

    const upload = await prisma.applicationUpload.create({
      data: {
        applicationId,
        fileName: req.file.originalname || 'document',
        docLabel,
        fileUrl: fileToDataUrl(req.file),
        fileType: req.file.mimetype,
      },
    });

    res.status(201).json(upload);
  } catch (error) {
    next(error);
  }
}

export async function deleteApplicationDocument(req, res, next) {
  try {
    const applicationId = Number.parseInt(req.params.id, 10);
    const uploadId = Number.parseInt(req.params.uploadId, 10);

    const upload = await prisma.applicationUpload.findFirst({
      where: { id: uploadId, applicationId },
    });

    if (!upload) return res.status(404).json({ error: 'Document not found' });

    await prisma.applicationUpload.delete({ where: { id: uploadId } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Document not found' });
    }
    next(error);
  }
}
