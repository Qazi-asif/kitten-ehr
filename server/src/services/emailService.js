import nodemailer from 'nodemailer';
import prisma from '../lib/prisma.js';
import {
  APPLICATION_REVIEW_STATUSES,
  EMAIL_TEMPLATE_KEYS,
  STATUS_EMAIL_TEMPLATE_MAP,
} from '../constants/emailTemplates.js';
import { getApplicantEmail, getApplicantName } from '../utils/applicationFormData.js';
import { wrapEmailContent } from '../utils/emailLayout.js';

const SETTINGS_ID = 1;

function renderTemplateString(template, variables) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value == null ? '' : String(value);
  });
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveEmailProvider(settings) {
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.AWS_SES_REGION || process.env.SES_REGION) return 'ses';
  const host = (process.env.SMTP_HOST || settings.smtpHost || '').toLowerCase();
  if (host.includes('sendgrid')) return 'sendgrid';
  if (host.includes('amazonaws')) return 'ses';
  return 'smtp';
}

function buildApplicationVariables(application, statusNotes = '') {
  const notes = statusNotes?.trim() || 'No additional notes provided.';
  return {
    applicantName: getApplicantName(application.formData),
    applicantEmail: getApplicantEmail(application.formData),
    applicationId: String(application.id),
    applicationType: application.type,
    applicationStatus: application.status,
    kittenOfInterest: application.kittenOfInterest || 'Unspecified',
    reviewNotes: notes,
    denialReason: notes,
    statusNotes: notes,
  };
}

async function getEmailSettings() {
  let settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: SETTINGS_ID },
    });
  }
  return settings;
}

async function logEmailAttempt({
  templateKey,
  toEmail,
  subject,
  status,
  provider = 'smtp',
  externalMessageId = '',
  errorMessage = '',
  relatedType = '',
  relatedId = null,
}) {
  try {
    await prisma.emailLog.create({
      data: {
        templateKey,
        toEmail,
        subject,
        status,
        provider,
        externalMessageId,
        errorMessage,
        relatedType,
        relatedId,
      },
    });
  } catch (error) {
    console.error('Failed to write email log:', error.message);
  }
}

async function getActiveTemplate(templateKey) {
  return prisma.emailTemplate.findFirst({
    where: { key: templateKey, isActive: true },
  });
}

async function getLayoutTemplate() {
  const layout = await getActiveTemplate(EMAIL_TEMPLATE_KEYS.EMAIL_LAYOUT);
  return layout?.bodyHtml || null;
}

async function buildRenderedEmail(template, variables) {
  const subject = renderTemplateString(template.subject, variables);
  const innerHtml = renderTemplateString(template.bodyHtml, variables);
  const layoutHtml = await getLayoutTemplate();
  const html = template.key === EMAIL_TEMPLATE_KEYS.EMAIL_LAYOUT
    ? innerHtml
    : wrapEmailContent(innerHtml, variables, layoutHtml);
  const textSource = template.bodyText || stripHtml(innerHtml);
  const text = renderTemplateString(textSource, variables);

  return { subject, html, text };
}

export async function sendTemplatedEmail({
  templateKey,
  toEmail,
  variables = {},
  relatedType = '',
  relatedId = null,
}) {
  const settings = await getEmailSettings();
  const recipient = toEmail?.trim();
  const provider = resolveEmailProvider(settings);

  if (!settings.emailsEnabled) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient || 'unknown',
      subject: '(skipped - emails disabled)',
      status: 'skipped',
      provider,
      errorMessage: 'Email sending is disabled in settings',
      relatedType,
      relatedId,
    });
    return { ok: false, skipped: true };
  }

  if (!recipient) {
    await logEmailAttempt({
      templateKey,
      toEmail: 'unknown',
      subject: '(skipped - missing recipient)',
      status: 'skipped',
      provider,
      errorMessage: 'Recipient email is missing',
      relatedType,
      relatedId,
    });
    return { ok: false, skipped: true };
  }

  const template = await getActiveTemplate(templateKey);
  if (!template) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject: '(skipped - template missing/inactive)',
      status: 'skipped',
      provider,
      errorMessage: `Template ${templateKey} not found or inactive`,
      relatedType,
      relatedId,
    });
    return { ok: false, skipped: true };
  }

  const mergedVariables = {
    orgName: settings.orgName || 'Pawsitive Transformations',
    ...variables,
  };

  const { subject, html, text } = await buildRenderedEmail(template, mergedVariables);

  const smtpPass = process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || settings.smtpPass;
  const smtpHost = process.env.SMTP_HOST || settings.smtpHost;
  const smtpUser = process.env.SMTP_USER || settings.smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject,
      status: 'skipped',
      provider,
      errorMessage: 'SMTP is not fully configured',
      relatedType,
      relatedId,
    });
    return { ok: false, skipped: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${settings.fromName || settings.orgName}" <${settings.fromEmail || smtpUser}>`,
      to: recipient,
      subject,
      text,
      html: html || undefined,
    });

    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject,
      status: 'sent',
      provider,
      externalMessageId: info.messageId || '',
      relatedType,
      relatedId,
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject,
      status: 'failed',
      provider,
      errorMessage: error.message,
      relatedType,
      relatedId,
    });
    console.error(`Email failed (${templateKey}):`, error.message);
    return { ok: false, error: error.message };
  }
}

export async function sendApplicationReceivedEmails(application) {
  const settings = await getEmailSettings();
  const baseVars = buildApplicationVariables(application);

  await Promise.all([
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.APPLICATION_RECEIVED,
      toEmail: baseVars.applicantEmail,
      variables: baseVars,
      relatedType: 'Application',
      relatedId: application.id,
    }),
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.APPLICATION_RECEIVED_ADMIN,
      toEmail: settings.adminNotifyEmail,
      variables: baseVars,
      relatedType: 'Application',
      relatedId: application.id,
    }),
  ]);
}

export async function sendApplicationStatusChangedEmail(application, statusNotes = '') {
  if (!APPLICATION_REVIEW_STATUSES.includes(application.status)) {
    return { ok: false, skipped: true };
  }

  const templateKey =
    STATUS_EMAIL_TEMPLATE_MAP[application.status] || EMAIL_TEMPLATE_KEYS.APPLICATION_STATUS_CHANGED;

  return sendTemplatedEmail({
    templateKey,
    toEmail: getApplicantEmail(application.formData),
    variables: buildApplicationVariables(application, statusNotes),
    relatedType: 'Application',
    relatedId: application.id,
  });
}

export async function sendDonationReceivedEmails({ transaction, donorName, donorEmail }) {
  const settings = await getEmailSettings();
  const vars = {
    donorName: donorName || 'Supporter',
    donorEmail: donorEmail || '',
    amount: Number(transaction.amount).toFixed(2),
    donationDate: new Date(transaction.date).toLocaleDateString(),
  };

  await Promise.all([
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.DONATION_RECEIVED,
      toEmail: donorEmail,
      variables: vars,
      relatedType: 'Donation',
      relatedId: transaction.id,
    }),
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.DONATION_RECEIVED_ADMIN,
      toEmail: settings.adminNotifyEmail,
      variables: vars,
      relatedType: 'Donation',
      relatedId: transaction.id,
    }),
  ]);
}
