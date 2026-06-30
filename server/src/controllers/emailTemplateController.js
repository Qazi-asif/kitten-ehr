import prisma from '../lib/prisma.js';
import { TEMPLATE_VARIABLES } from '../constants/emailTemplates.js';
import {
  createEmailTemplateSchema,
  formatZodError,
  updateEmailTemplateSchema,
} from '../validations/emailTemplateValidation.js';

const SETTINGS_ID = 1;

export async function getEmailTemplates(_req, res, next) {
  try {
    const [templates, settings] = await Promise.all([
      prisma.emailTemplate.findMany({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      prisma.settings.findUnique({ where: { id: SETTINGS_ID } }),
    ]);

    const { smtpPass, ...emailSettings } = settings || {};

    res.json({
      templates,
      variables: TEMPLATE_VARIABLES,
      delivery: settings
        ? {
            ...emailSettings,
            smtpPassConfigured: Boolean(smtpPass || process.env.SMTP_PASS),
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function createEmailTemplate(req, res, next) {
  try {
    const parsed = createEmailTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { key: parsed.data.key } });
    if (existing) return res.status(400).json({ error: 'Template key already exists' });

    const template = await prisma.emailTemplate.create({
      data: {
        ...parsed.data,
        isSystem: false,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
}

export async function updateEmailTemplate(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const parsed = updateEmailTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: formatZodError(parsed.error) });
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Email template not found' });

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: parsed.data,
    });

    res.json(template);
  } catch (error) {
    next(error);
  }
}

export async function deleteEmailTemplate(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Email template not found' });
    if (existing.isSystem) {
      return res.status(400).json({ error: 'System templates cannot be deleted. Deactivate them instead.' });
    }

    await prisma.emailTemplate.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getEmailLogs(req, res, next) {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 200);
    const logs = await prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
}

export async function updateEmailSettings(req, res, next) {
  try {
    const {
      emailsEnabled,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromEmail,
      fromName,
      adminNotifyEmail,
    } = req.body;

    const data = {};
    if (emailsEnabled !== undefined) data.emailsEnabled = Boolean(emailsEnabled);
    if (smtpHost !== undefined) data.smtpHost = String(smtpHost).trim();
    if (smtpPort !== undefined) {
      const parsed = Number.parseInt(smtpPort, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return res.status(400).json({ error: 'smtpPort must be a positive integer' });
      }
      data.smtpPort = parsed;
    }
    if (smtpSecure !== undefined) data.smtpSecure = Boolean(smtpSecure);
    if (smtpUser !== undefined) data.smtpUser = String(smtpUser).trim();
    if (smtpPass !== undefined && smtpPass !== '') data.smtpPass = String(smtpPass);
    if (fromEmail !== undefined) data.fromEmail = String(fromEmail).trim();
    if (fromName !== undefined) data.fromName = String(fromName).trim();
    if (adminNotifyEmail !== undefined) data.adminNotifyEmail = String(adminNotifyEmail).trim();

    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });

    const { smtpPass: storedPass, ...rest } = settings;
    res.json({
      ...rest,
      smtpPassConfigured: Boolean(storedPass || process.env.SMTP_PASS),
    });
  } catch (error) {
    next(error);
  }
}
