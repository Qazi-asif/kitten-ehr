import prisma from '../lib/prisma.js';
import {
  createApplicationSchema,
  extractKittenOfInterest,
  formatZodError,
} from '../validations/applicationValidation.js';
import { sendApplicationReceivedEmails, sendApplicationStatusChangedEmail } from '../services/emailService.js';
import { APPLICATION_REVIEW_STATUSES } from '../constants/emailTemplates.js';
import { validateUploadedFile } from '../utils/fileValidation.js';
import { persistApplicationFile, isStoredFileUrl, resolveStoredFileAbsolutePath } from '../utils/fileStorage.js';
import { parseApplicationFormData } from '../utils/applicationFormData.js';
import { translateExperienceLevel, translateCapabilityFlags, translateMaxKittens } from '../utils/fosterApplicationMapping.js';

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

async function resolveApplicationFileUrl(applicationId, file) {
  return persistApplicationFile(applicationId, file);
}

async function saveApplicationUploads(applicationId, files = []) {
  const uploads = [];

  for (const file of files.slice(0, MAX_APPLICATION_PHOTOS)) {
    const fileCheck = validateUploadedFile(file);
    if (!fileCheck.ok) {
      throw Object.assign(new Error(fileCheck.error), { status: fileCheck.status });
    }

    const mime = (file.mimetype || '').toLowerCase();
    const looksLikeImage = mime.startsWith('image/')
      || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.originalname || '');
    if (!looksLikeImage) {
      throw Object.assign(new Error('Only image uploads are allowed for application photos.'), { status: 400 });
    }

    uploads.push(
      prisma.applicationUpload.create({
        data: {
          applicationId,
          fileName: file.originalname || 'upload',
          docLabel: 'Applicant Photo',
          fileUrl: await resolveApplicationFileUrl(applicationId, file),
          fileType: mime || 'application/octet-stream',
        },
      }),
    );
  }

  if (uploads.length === 0) return [];
  return Promise.all(uploads);
}

export async function getApplications(req, res, next) {
  try {
    const { status, pendingContract } = req.query;
    const where = {};
    if (status) where.status = status;

    // Used by the Contracts page's "Pending Contracts" queue: Approved
    // applications with no Contract row pointing back at them yet, via the
    // real Application.contracts relation - not a text/email match, an exact
    // relational filter (mirrors why PersonContractsSection was fixed to use
    // applicationId/fosterId instead of a fuzzy signerEmail search).
    if (pendingContract === 'true') where.contracts = { none: {} };

    const applications = await prisma.application.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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

    const { type, formData, kittenOfInterest, kittenId } = parsed.data;
    const serializedFormData = typeof formData === 'string' ? formData : JSON.stringify(formData);
    const resolvedKittenOfInterest = extractKittenOfInterest(formData, kittenOfInterest);
    const photoFiles = Array.isArray(req.files) ? req.files : [];

    if (photoFiles.length > MAX_APPLICATION_PHOTOS) {
      return res.status(400).json({ error: `Maximum ${MAX_APPLICATION_PHOTOS} photos allowed.` });
    }

    const kitten = kittenId
      ? await prisma.kitten.findUnique({ where: { id: kittenId }, select: { status: true } })
      : null;

    const application = await prisma.application.create({
      data: {
        type,
        formData: serializedFormData,
        kittenOfInterest: resolvedKittenOfInterest,
        kittenStatusAtSubmission: kitten?.status ?? null,
      },
    });

    let uploads = [];
    let uploadWarning = null;
    if (photoFiles.length > 0) {
      try {
        uploads = await saveApplicationUploads(application.id, photoFiles);
      } catch (uploadError) {
        // Keep the application even if photos fail — foster inquiries should
        // not be lost because of a HEIC/MIME/storage issue.
        console.error('Application photo upload failed:', uploadError.message);
        uploadWarning = uploadError.message || 'Photos could not be saved. Your application was still submitted.';
      }
    }

    if (process.env.SKIP_APPLICATION_EMAILS !== '1') {
      sendApplicationReceivedEmails(application).catch((error) => {
        console.error('Application email trigger failed:', error.message);
      });
    }

    res.status(201).json({ ...application, uploads, uploadWarning });
  } catch (error) {
    next(error);
  }
}

// Builds the preview payload the (future) confirmation modal renders after
// a Foster application is Approved. Read-only - never creates a Foster or
// portal account itself. See foster-auto-provision-plan.md §2/§3/§4.
async function buildFosterProvisionPreview(application) {
  const parsed = parseApplicationFormData(application.formData);
  const email = (parsed.email || '').trim().toLowerCase();

  const existingFoster = email
    ? await prisma.foster.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      })
    : null;

  let existingFosterHasPortalAccount = false;
  if (existingFoster) {
    const portalUser = await prisma.user.findFirst({ where: { fosterId: existingFoster.id } });
    existingFosterHasPortalAccount = Boolean(portalUser);
  }

  return {
    applicationId: application.id,
    existingFoster: existingFoster
      ? { id: existingFoster.id, name: existingFoster.name, email: existingFoster.email }
      : null,
    existingFosterHasPortalAccount,
    mapped: {
      name: parsed.fullName || '',
      phone: parsed.phone || '',
      email: parsed.email || '',
      address: parsed.address || '',
      experienceLevel: translateExperienceLevel(parsed.experienceLevel),
      capabilityFlags: translateCapabilityFlags(parsed.capacity),
      notes: parsed.message || '',
      maxKittens: translateMaxKittens(parsed.maxKittens),
      emergencyContact: '',
      photoUrl: null,
    },
  };
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

    let fosterProvisionPreview = null;
    if (statusChanged && application.status === 'Approved' && application.type === 'Foster') {
      fosterProvisionPreview = await buildFosterProvisionPreview(application);
    }

    res.json({ ...application, fosterProvisionPreview });
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
        fileUrl: await resolveApplicationFileUrl(applicationId, req.file),
        fileType: req.file.mimetype,
      },
    });

    res.status(201).json(upload);
  } catch (error) {
    next(error);
  }
}

export async function streamApplicationUploadFile(req, res, next) {
  try {
    const applicationId = Number.parseInt(req.params.id, 10);
    const uploadId = Number.parseInt(req.params.uploadId, 10);

    const upload = await prisma.applicationUpload.findFirst({
      where: { id: uploadId, applicationId },
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const fileUrl = upload.fileUrl || '';
    const fileName = upload.fileName || 'document';
    const contentType = upload.fileType || 'application/octet-stream';
    const disposition = `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`;

    if (fileUrl.startsWith('data:')) {
      const match = /^data:([^;,]+);base64,(.+)$/s.exec(fileUrl);
      if (!match) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.setHeader('Content-Type', match[1] || contentType);
      res.setHeader('Content-Disposition', disposition);
      res.setHeader('Cache-Control', 'private, no-store');
      return res.send(Buffer.from(match[2], 'base64'));
    }

    if (isStoredFileUrl(fileUrl)) {
      const absolutePath = resolveStoredFileAbsolutePath(fileUrl);
      if (!absolutePath) {
        return res.status(404).json({ error: 'File not found' });
      }
      return res.sendFile(absolutePath, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': disposition,
          'Cache-Control': 'private, no-store',
        },
      }, (err) => {
        if (err) {
          if (!res.headersSent) {
            res.status(404).json({ error: 'File not found' });
          }
        }
      });
    }

    if (/^https?:\/\//i.test(fileUrl)) {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.redirect(302, fileUrl);
    }

    return res.status(404).json({ error: 'File not found' });
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
