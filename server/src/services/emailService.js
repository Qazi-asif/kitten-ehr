import nodemailer from 'nodemailer';
import prisma from '../lib/prisma.js';
import {
  APPLICATION_REVIEW_STATUSES,
  EMAIL_TEMPLATE_KEYS,
  STATUS_EMAIL_TEMPLATE_MAP,
} from '../constants/emailTemplates.js';
import { sponsorshipOverflowDisclosure } from '../constants/donationCopy.js';
import { getApplicantEmail, getApplicantName } from '../utils/applicationFormData.js';
import { wrapEmailContent } from '../utils/emailLayout.js';
import { escapeHtml } from '../utils/htmlEscape.js';

const SETTINGS_ID = 1;
let cachedTransporter = null;
let cachedTransporterKey = '';

function renderTemplateString(template, variables, { escapeValues = false } = {}) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    if (value == null) return '';
    const text = String(value);
    return escapeValues ? escapeHtml(text) : text;
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
  const innerHtml = renderTemplateString(template.bodyHtml, variables, { escapeValues: true });
  const layoutHtml = await getLayoutTemplate();
  const html = template.key === EMAIL_TEMPLATE_KEYS.EMAIL_LAYOUT
    ? innerHtml
    : wrapEmailContent(innerHtml, variables, layoutHtml);
  const textSource = template.bodyText || stripHtml(innerHtml);
  const text = renderTemplateString(textSource, variables);

  return { subject, html, text };
}

function getSmtpTransporter(settings, smtpHost, smtpUser, smtpPass) {
  const key = `${smtpHost}|${settings.smtpPort}|${settings.smtpSecure}|${smtpUser}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: settings.smtpPort || 587,
    secure: settings.smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  cachedTransporterKey = key;
  return cachedTransporter;
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
    const transporter = getSmtpTransporter(settings, smtpHost, smtpUser, smtpPass);

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
    orgName: settings.orgName || 'Pawsitive Transformations',
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

export async function sendSponsorshipReceivedEmails({
  transaction,
  donorName,
  donorEmail,
  kittenName,
  tier,
}) {
  const settings = await getEmailSettings();
  const vars = {
    donorName: donorName || 'Supporter',
    donorEmail: donorEmail || '',
    amount: Number(transaction.amount).toFixed(2),
    donationDate: new Date(transaction.date).toLocaleDateString(),
    orgName: settings.orgName || 'Pawsitive Transformations',
    kittenName: kittenName || 'your sponsored kitten',
    tier: tier || 'Custom',
    overflowDisclosure: sponsorshipOverflowDisclosure(kittenName || 'this kitten'),
  };

  await Promise.all([
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.SPONSORSHIP_RECEIVED,
      toEmail: donorEmail,
      variables: vars,
      relatedType: 'Sponsorship',
      relatedId: transaction.id,
    }),
    sendTemplatedEmail({
      templateKey: EMAIL_TEMPLATE_KEYS.SPONSORSHIP_RECEIVED_ADMIN,
      toEmail: settings.adminNotifyEmail,
      variables: vars,
      relatedType: 'Sponsorship',
      relatedId: transaction.id,
    }),
  ]);
}

// Builds a nodemailer attachment from Contract.pdfUrl, which is either a
// base64 data URL (no object storage configured - current default) or a
// real https:// URL (if S3/R2 is ever configured). Returns null if pdfUrl
// is empty or in neither recognized shape, so callers can skip cleanly
// rather than send a broken attachment.
function buildPdfAttachment(pdfUrl, filename) {
  if (!pdfUrl) return null;

  const dataUrlMatch = /^data:application\/pdf;base64,(.+)$/.exec(pdfUrl);
  if (dataUrlMatch) {
    return { filename, content: dataUrlMatch[1], encoding: 'base64' };
  }

  if (/^https?:\/\//i.test(pdfUrl)) {
    return { filename, path: pdfUrl };
  }

  return null;
}

/**
 * Emails the already-generated signed PDF (Contract.pdfUrl) as an
 * attachment. Separate from sendContractAgreementEmail on purpose - this is
 * a new, additive action for SIGNED contracts only, not a change to the
 * existing SENT-contract "Email" flow above, which is untouched.
 */
export async function sendSignedContractPdfEmail({ contract }) {
  const settings = await getEmailSettings();
  const recipient = contract.signerEmail?.trim();
  const provider = resolveEmailProvider(settings);
  const templateKey = EMAIL_TEMPLATE_KEYS.CONTRACT_SIGNED_PDF;
  const kittenName = contract.kittenName || contract.kitten?.name || 'your cat';
  const agreementLabel = contract.type === 'ADOPTION' ? 'Cat Adoption Agreement' : 'Foster Care Agreement';
  const subject = `${settings.orgName || 'Pawsitive Transformations'} — Signed ${agreementLabel}`;

  if (!settings.emailsEnabled) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient || 'unknown',
      subject: '(skipped - emails disabled)',
      status: 'skipped',
      provider,
      errorMessage: 'Email sending is disabled in settings',
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    return { ok: false, skipped: true, errorMessage: 'Email sending is disabled in settings' };
  }

  if (!recipient) {
    await logEmailAttempt({
      templateKey,
      toEmail: 'unknown',
      subject: '(skipped - missing recipient)',
      status: 'skipped',
      provider,
      errorMessage: 'Recipient email is missing',
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    return { ok: false, skipped: true, errorMessage: 'Recipient email is missing' };
  }

  const filename = `${agreementLabel.replace(/\s+/g, '-')}-${contract.id}.pdf`;
  const attachment = buildPdfAttachment(contract.pdfUrl, filename);
  if (!attachment) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject: '(skipped - no PDF available)',
      status: 'skipped',
      provider,
      errorMessage: 'No PDF is available for this contract',
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    return { ok: false, skipped: true, errorMessage: 'No PDF is available for this contract' };
  }

  const innerHtml = `
<h2 style="margin:0 0 16px;font-size:20px;">Your Signed Agreement for ${escapeHtml(kittenName)}</h2>
<p>Hi ${escapeHtml(contract.signerName)},</p>
<p>Attached is your signed ${escapeHtml(agreementLabel)} from ${escapeHtml(settings.orgName || 'Pawsitive Transformations')}, for your records.</p>
<p>If you have questions, reply to this email or contact us directly.</p>
<p>Thank you,<br>${escapeHtml(settings.orgName || 'Pawsitive Transformations')}</p>`;

  const layoutHtml = await getLayoutTemplate();
  const html = wrapEmailContent(innerHtml, { orgName: settings.orgName }, layoutHtml);
  const text = stripHtml(innerHtml);

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
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    return { ok: false, skipped: true, errorMessage: 'SMTP is not fully configured' };
  }

  try {
    const transporter = getSmtpTransporter(settings, smtpHost, smtpUser, smtpPass);
    const info = await transporter.sendMail({
      from: `"${settings.fromName || settings.orgName}" <${settings.fromEmail || smtpUser}>`,
      to: recipient,
      subject,
      text,
      html: html || undefined,
      attachments: [attachment],
    });

    // Only truthy when the message was actually sent through an Ethereal
    // test account - safe to call unconditionally, no effect on real SMTP.
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject,
      status: 'sent',
      provider,
      externalMessageId: info.messageId || '',
      relatedType: 'Contract',
      relatedId: contract.id,
    });

    return { ok: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject,
      status: 'failed',
      provider,
      errorMessage: error.message,
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    console.error('Signed contract PDF email failed:', error.message);
    return { ok: false, error: error.message };
  }
}

export async function sendContractAgreementEmail({ contract, agreementText, note = '' }) {
  const settings = await getEmailSettings();
  const recipient = contract.signerEmail?.trim();
  const provider = resolveEmailProvider(settings);
  const templateKey = EMAIL_TEMPLATE_KEYS.CONTRACT_AGREEMENT;
  const kittenName = contract.kittenName || contract.kitten?.name || 'your cat';
  const subject = `${settings.orgName || 'Pawsitive Transformations'} — ${contract.type === 'ADOPTION' ? 'Cat Adoption Agreement' : 'Foster Care Agreement'}`;

  if (!settings.emailsEnabled) {
    await logEmailAttempt({
      templateKey,
      toEmail: recipient || 'unknown',
      subject: '(skipped - emails disabled)',
      status: 'skipped',
      provider,
      errorMessage: 'Email sending is disabled in settings',
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    return { ok: false, skipped: true, errorMessage: 'Email sending is disabled in settings' };
  }

  if (!recipient) {
    await logEmailAttempt({
      templateKey,
      toEmail: 'unknown',
      subject: '(skipped - missing recipient)',
      status: 'skipped',
      provider,
      errorMessage: 'Recipient email is missing',
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    return { ok: false, skipped: true, errorMessage: 'Recipient email is missing' };
  }

  const noteBlock = note
    ? `<p style="margin:0 0 16px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">${escapeHtml(note)}</p>`
    : '';

  const innerHtml = `
<h2 style="margin:0 0 16px;font-size:20px;">Agreement for ${escapeHtml(kittenName)}</h2>
<p>Hi ${escapeHtml(contract.signerName)},</p>
<p>Please review the agreement below from ${escapeHtml(settings.orgName || 'Pawsitive Transformations')}. A team member will help you complete signing in the admin portal or at your adoption appointment.</p>
${noteBlock}
<pre style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;font-family:Georgia,serif;font-size:13px;line-height:1.6;color:#334155;">${escapeHtml(agreementText)}</pre>
<p>If you have questions, reply to this email or contact us directly.</p>
<p>Thank you,<br>${escapeHtml(settings.orgName || 'Pawsitive Transformations')}</p>`;

  const layoutHtml = await getLayoutTemplate();
  const html = wrapEmailContent(innerHtml, { orgName: settings.orgName }, layoutHtml);
  const text = stripHtml(innerHtml);

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
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    return { ok: false, skipped: true, errorMessage: 'SMTP is not fully configured' };
  }

  try {
    const transporter = getSmtpTransporter(settings, smtpHost, smtpUser, smtpPass);
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
      relatedType: 'Contract',
      relatedId: contract.id,
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
      relatedType: 'Contract',
      relatedId: contract.id,
    });
    console.error('Contract agreement email failed:', error.message);
    return { ok: false, error: error.message };
  }
}
