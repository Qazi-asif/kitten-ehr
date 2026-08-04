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
import { formatPacificDisplay } from '../utils/pacificDate.js';

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
    const envReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    settings = await prisma.settings.create({
      data: {
        id: SETTINGS_ID,
        emailsEnabled: envReady,
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: Number(process.env.SMTP_PORT) || 587,
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        fromEmail: process.env.SMTP_USER || '',
        fromName: 'Pawsitive Transformations',
        adminNotifyEmail: process.env.SMTP_USER || '',
      },
    });
    return settings;
  }

  // Same self-heal as Settings GET: env SMTP present but DB still disabled/empty.
  const envHost = process.env.SMTP_HOST;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const needsPatch =
    envHost && envUser && envPass
    && (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.emailsEnabled);

  if (needsPatch) {
    const port = Number(process.env.SMTP_PORT) || 587;
    settings = await prisma.settings.update({
      where: { id: SETTINGS_ID },
      data: {
        emailsEnabled: true,
        smtpHost: settings.smtpHost || envHost,
        smtpPort: settings.smtpPort || port,
        smtpSecure: false,
        smtpUser: settings.smtpUser || envUser,
        smtpPass: settings.smtpPass || envPass,
        fromEmail: settings.fromEmail || envUser,
        fromName: settings.fromName || settings.orgName || 'Pawsitive Transformations',
        adminNotifyEmail: settings.adminNotifyEmail || envUser,
      },
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
  const settings = await getEmailSettings();
  const merged = {
    orgName: settings.orgName,
    orgLogoUrl: settings.orgLogoUrl || '',
    ...variables,
  };
  const subject = renderTemplateString(template.subject, merged);
  const innerHtml = renderTemplateString(template.bodyHtml, merged, { escapeValues: true });
  const layoutHtml = await getLayoutTemplate();
  const html = template.key === EMAIL_TEMPLATE_KEYS.EMAIL_LAYOUT
    ? innerHtml
    : wrapEmailContent(innerHtml, merged, layoutHtml);
  const textSource = template.bodyText || stripHtml(innerHtml);
  const text = renderTemplateString(textSource, merged);

  return { subject, html, text };
}

function getSmtpTransporter(settings, smtpHost, smtpUser, smtpPass) {
  const port = Number(settings.smtpPort) || 587;
  // Derive secure ONLY from the port — never trust the stored smtpSecure flag
  // because it can be stale. 465 = direct SSL, everything else = STARTTLS.
  const secure = port === 465;

  const key = `${smtpHost}|${port}|${secure}|${smtpUser}|${smtpPass}`;
  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: { rejectUnauthorized: false },
    // Nodemailer's own defaults here are very long (connectionTimeout 2min,
    // socketTimeout 10min) - a stalled/unresponsive mail server would hang a
    // send for that long with no bound. Same bounded values already proven
    // out in sendTestEmail() below.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
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
      errorMessage: 'Email sending is disabled in Settings → Emails. Turn on “Emails enabled” and confirm SMTP host, user, and password.',
      relatedType,
      relatedId,
    });
    return {
      ok: false,
      skipped: true,
      errorMessage: 'Email sending is disabled in Settings → Emails. Turn on “Emails enabled” and confirm SMTP host, user, and password.',
    };
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
      errorMessage: 'SMTP is not fully configured. Set host, username, and password in Settings → Emails (or SMTP_* env vars), then try again.',
      relatedType,
      relatedId,
    });
    return {
      ok: false,
      skipped: true,
      errorMessage: 'SMTP is not fully configured. Set host, username, and password in Settings → Emails (or SMTP_* env vars), then try again.',
    };
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

function describeSmtpError(error) {
  switch (error.code) {
    case 'EAUTH':
      return 'Authentication failed. Check the SMTP username and password.';
    case 'ECONNREFUSED':
    case 'ENOTFOUND':
      return 'Could not reach the SMTP host. Check the host and port.';
    case 'ETIMEDOUT':
    case 'ESOCKET':
      return 'Connection timed out. Check the host, port, and that outbound SMTP is not blocked.';
    default:
      return error.message || 'Failed to send test email.';
  }
}

// Sends a one-off test message to confirm SMTP settings work, from the
// Settings page's "Send Test Email" button. Any field left blank/undefined
// falls back to the currently-saved Settings row - same convention
// updateSettings already uses for smtpPass (the client never has the real
// saved password to send back), extended here to every SMTP field so the
// button works whether staff edited everything, nothing, or just one field.
//
// Deliberately does NOT use getSmtpTransporter()'s module-level cache above -
// a test send may use host/port/credentials that differ from (or haven't yet
// overwritten) the cached production transporter, and a failed test must
// never leave a bad transporter cached for real sends to pick up. Uses its
// own short timeouts so a wrong host or blocked port fails fast instead of
// hanging on nodemailer's much longer default. Also runs regardless of
// settings.emailsEnabled - "would sending work if it were on" is exactly
// what this button answers.
export async function sendTestEmail({ smtpHost, smtpPort, smtpUser, smtpPass, toEmail }) {
  const settings = await getEmailSettings();

  const effectiveHost = smtpHost?.trim() || settings.smtpHost;
  const parsedPort = smtpPort !== undefined && smtpPort !== '' ? Number(smtpPort) : NaN;
  const effectivePort = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : (settings.smtpPort || 587);
  const effectiveUser = smtpUser?.trim() || settings.smtpUser;
  const effectivePass = smtpPass || settings.smtpPass;
  // Secure is always derived from port, never a trusted flag - same rule as
  // every other send path in this file (465 = SSL, else STARTTLS).
  const effectiveSecure = effectivePort === 465;
  const recipient = (toEmail?.trim() || settings.adminNotifyEmail || '').trim();

  if (!effectiveHost || !effectiveUser || !effectivePass) {
    return { ok: false, error: 'SMTP host, username, and password are required to send a test email.' };
  }
  if (!recipient) {
    return { ok: false, error: 'A recipient email address is required.' };
  }

  const templateKey = 'settings.smtp.test';
  const subject = `${settings.orgName || 'Pawsitive Transformations'} — SMTP Test Email`;
  const text = `This is a test email from ${settings.orgName || 'Pawsitive Transformations'} to confirm your SMTP settings are working.`;
  const html = `<p>${escapeHtml(text)}</p>`;
  const provider = resolveEmailProvider({ ...settings, smtpHost: effectiveHost });

  const transporter = nodemailer.createTransport({
    host: effectiveHost,
    port: effectivePort,
    secure: effectiveSecure,
    auth: { user: effectiveUser, pass: effectivePass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${settings.fromName || settings.orgName}" <${settings.fromEmail || effectiveUser}>`,
      to: recipient,
      subject,
      text,
      html,
    });

    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject,
      status: 'sent',
      provider,
      externalMessageId: info.messageId || '',
      relatedType: 'Settings',
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const friendly = describeSmtpError(error);

    await logEmailAttempt({
      templateKey,
      toEmail: recipient,
      subject,
      status: 'failed',
      provider,
      errorMessage: friendly,
      relatedType: 'Settings',
    });

    return { ok: false, error: friendly };
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
    donationDate: formatPacificDisplay(transaction.date),
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
    donationDate: formatPacificDisplay(transaction.date),
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
    return { ok: false, skipped: true, errorMessage: 'Email sending is disabled in Settings → Emails. Turn on “Emails enabled” and confirm SMTP host, user, and password.' };
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

  const signedAtFormatted = contract.signedAt
    ? new Date(contract.signedAt).toLocaleString('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '';
  const fosterName = contract.foster?.name || '';

  const innerHtml = `
<h2 style="margin:0 0 16px;font-size:20px;">Your Signed Agreement for ${escapeHtml(kittenName)}</h2>
<p>Hi ${escapeHtml(contract.signerName)},</p>
<p>Attached is your signed ${escapeHtml(agreementLabel)} from ${escapeHtml(settings.orgName || 'Pawsitive Transformations')}, for your records.</p>
<p>
  Signed by: ${escapeHtml(contract.signerName)}${signedAtFormatted ? `<br>Signed on: ${escapeHtml(signedAtFormatted)}` : ''}${fosterName ? `<br>Foster: ${escapeHtml(fosterName)}` : ''}
</p>
<p>Your signature is captured on the attached PDF.</p>
<p>If you have questions, reply to this email or contact us directly.</p>
<p>Thank you,<br>${escapeHtml(settings.orgName || 'Pawsitive Transformations')}</p>`;

  const layoutHtml = await getLayoutTemplate();
  const html = wrapEmailContent(innerHtml, { orgName: settings.orgName, orgLogoUrl: settings.orgLogoUrl || '' }, layoutHtml);
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
    return { ok: false, skipped: true, errorMessage: 'SMTP is not fully configured. Set host, username, and password in Settings → Emails (or SMTP_* env vars), then try again.' };
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

export async function sendContractAgreementEmail({ contract, agreementText, note = '', signingUrl = '' }) {
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
    return { ok: false, skipped: true, errorMessage: 'Email sending is disabled in Settings → Emails. Turn on “Emails enabled” and confirm SMTP host, user, and password.' };
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

  const signBlock = signingUrl
    ? `<p style="margin:24px 0;"><a href="${escapeHtml(signingUrl)}" style="display:inline-block;padding:14px 28px;background:#0d9488;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">Sign this agreement electronically</a></p>
<p style="margin:0 0 16px;font-size:13px;color:#64748b;">Or copy this link into your browser:<br><a href="${escapeHtml(signingUrl)}" style="color:#0d9488;word-break:break-all;">${escapeHtml(signingUrl)}</a></p>`
    : '<p>A team member will help you complete signing in person or at your adoption appointment.</p>';

  const innerHtml = `
<h2 style="margin:0 0 16px;font-size:20px;">Agreement for ${escapeHtml(kittenName)}</h2>
<p>Hi ${escapeHtml(contract.signerName)},</p>
<p>Please review the agreement below from ${escapeHtml(settings.orgName || 'Pawsitive Transformations')}, then sign electronically using the button below.</p>
${noteBlock}
${signBlock}
<pre style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap;font-family:Georgia,serif;font-size:13px;line-height:1.6;color:#334155;">${escapeHtml(agreementText)}</pre>
<p>If you have questions, reply to this email or contact us directly.</p>
<p>Thank you,<br>${escapeHtml(settings.orgName || 'Pawsitive Transformations')}</p>`;

  const layoutHtml = await getLayoutTemplate();
  const html = wrapEmailContent(innerHtml, { orgName: settings.orgName, orgLogoUrl: settings.orgLogoUrl || '' }, layoutHtml);
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
    return { ok: false, skipped: true, errorMessage: 'SMTP is not fully configured. Set host, username, and password in Settings → Emails (or SMTP_* env vars), then try again.' };
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
    return { ok: false, error: describeSmtpError(error) };
  }
}

/** Best-effort staff chat email notification (CR-81). Never throws to callers. */
export async function sendStaffChatNotificationEmail({
  toEmail,
  recipientName,
  senderName,
  preview,
  conversationLabel,
}) {
  if (!toEmail) return { ok: false, skipped: true };
  try {
    const settings = await getEmailSettings();
    if (!settings.emailsEnabled) return { ok: false, skipped: true, reason: 'emails disabled' };

    const smtpPass = process.env.SMTP_PASS || process.env.SENDGRID_API_KEY || settings.smtpPass;
    const smtpHost = process.env.SMTP_HOST || settings.smtpHost;
    const smtpUser = process.env.SMTP_USER || settings.smtpUser;
    if (!smtpHost || !smtpUser || !smtpPass) {
      return { ok: false, skipped: true, reason: 'smtp not configured' };
    }

    const transporter = getSmtpTransporter(settings, smtpHost, smtpUser, smtpPass);
    const subject = `New staff chat message from ${senderName || 'a teammate'}`;
    const safePreview = escapeHtml(String(preview || '').slice(0, 280));
    const htmlBody = `
      <p>Hi ${escapeHtml(recipientName || 'there')},</p>
      <p><strong>${escapeHtml(senderName || 'A teammate')}</strong> sent a message in
      <strong>${escapeHtml(conversationLabel || 'Staff Chat')}</strong>:</p>
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #10b981;background:#f8fafc;">
        ${safePreview}
      </blockquote>
      <p>Open the admin Staff Chat to reply.</p>
    `;
    const html = wrapEmailContent(htmlBody);

    const info = await transporter.sendMail({
      from: `"${settings.fromName || settings.orgName || 'Pawsitive Transformations'}" <${settings.fromEmail || smtpUser}>`,
      to: toEmail,
      subject,
      html,
      text: stripHtml(htmlBody),
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    console.error('[chat-email] notification failed:', error?.message || error);
    return { ok: false, error: error?.message || String(error) };
  }
}
