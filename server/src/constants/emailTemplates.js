import { buildDefaultEmailLayout, EMAIL_LAYOUT_KEY } from '../utils/emailLayout.js';

export const EMAIL_TEMPLATE_KEYS = {
  EMAIL_LAYOUT: EMAIL_LAYOUT_KEY,
  APPLICATION_RECEIVED: 'application.received',
  APPLICATION_RECEIVED_ADMIN: 'application.received.admin',
  APPLICATION_STATUS_CHANGED: 'application.status.changed',
  APPLICATION_APPROVED: 'application.status.approved',
  APPLICATION_DENIED: 'application.status.denied',
  APPLICATION_UNDER_REVIEW: 'application.status.under_review',
  DONATION_RECEIVED: 'donation.received',
  DONATION_RECEIVED_ADMIN: 'donation.received.admin',
};

export const APPLICATION_REVIEW_STATUSES = ['Approved', 'Denied', 'Under Review'];

export const STATUS_EMAIL_TEMPLATE_MAP = {
  Approved: EMAIL_TEMPLATE_KEYS.APPLICATION_APPROVED,
  Denied: EMAIL_TEMPLATE_KEYS.APPLICATION_DENIED,
  'Under Review': EMAIL_TEMPLATE_KEYS.APPLICATION_UNDER_REVIEW,
};

const approvedBody = `
<h2 style="margin:0 0 16px;font-size:20px;color:#059669;">Congratulations, {{applicantName}}!</h2>
<p>We are delighted to inform you that your <strong>{{applicationType}}</strong> application has been <strong style="color:#059669;">Approved</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
  <tr><td style="padding:16px;font-size:14px;">
    <p style="margin:0 0 8px;"><strong>Application ID:</strong> #{{applicationId}}</p>
    <p style="margin:0 0 8px;"><strong>Kitten of Interest:</strong> {{kittenOfInterest}}</p>
    <p style="margin:0;"><strong>Status:</strong> Approved</p>
  </td></tr>
</table>
<p>{{reviewNotes}}</p>
<p>Our team will reach out shortly with next steps. Thank you for choosing {{orgName}}.</p>`;

const deniedBody = `
<h2 style="margin:0 0 16px;font-size:20px;color:#b91c1c;">Application Update</h2>
<p>Hi {{applicantName}},</p>
<p>Thank you for your interest in {{orgName}}. After careful review, your <strong>{{applicationType}}</strong> application has been <strong style="color:#b91c1c;">Denied</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
  <tr><td style="padding:16px;font-size:14px;">
    <p style="margin:0 0 8px;"><strong>Application ID:</strong> #{{applicationId}}</p>
    <p style="margin:0 0 8px;"><strong>Kitten of Interest:</strong> {{kittenOfInterest}}</p>
    <p style="margin:0 0 8px;"><strong>Reason / Notes:</strong></p>
    <p style="margin:0;color:#7f1d1d;">{{denialReason}}</p>
  </td></tr>
</table>
<p>We encourage you to apply again in the future or contact us if you have questions.</p>`;

const underReviewBody = `
<h2 style="margin:0 0 16px;font-size:20px;color:#0369a1;">Your Application Is Under Review</h2>
<p>Hi {{applicantName}},</p>
<p>Your <strong>{{applicationType}}</strong> application with {{orgName}} is now <strong style="color:#0369a1;">Under Review</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
  <tr><td style="padding:16px;font-size:14px;">
    <p style="margin:0 0 8px;"><strong>Application ID:</strong> #{{applicationId}}</p>
    <p style="margin:0 0 8px;"><strong>Kitten of Interest:</strong> {{kittenOfInterest}}</p>
    <p style="margin:0 0 8px;"><strong>Review Notes:</strong></p>
    <p style="margin:0;">{{reviewNotes}}</p>
  </td></tr>
</table>
<p>We appreciate your patience while our team completes the review process.</p>`;

const donationThankYouBody = `
<h2 style="margin:0 0 16px;font-size:20px;color:#059669;">Thank You for Your Generosity!</h2>
<p>Dear {{donorName}},</p>
<p>On behalf of everyone at {{orgName}}, thank you for your donation. Your support directly funds rescue, medical care, and foster supplies.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
  <tr><td style="padding:16px;font-size:14px;">
    <p style="margin:0 0 8px;"><strong>Donation Amount:</strong> \${{amount}}</p>
    <p style="margin:0 0 8px;"><strong>Date:</strong> {{donationDate}}</p>
    <p style="margin:0;"><strong>Donor Email:</strong> {{donorEmail}}</p>
  </td></tr>
</table>
<p>With gratitude,<br/>The {{orgName}} Team</p>`;

const donationAdminBody = `
<h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">New Donation Received</h2>
<p>An online donation was recorded in {{orgName}}.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
  <tr><td style="padding:16px;font-size:14px;">
    <p style="margin:0 0 8px;"><strong>Donor Name:</strong> {{donorName}}</p>
    <p style="margin:0 0 8px;"><strong>Donor Email:</strong> {{donorEmail}}</p>
    <p style="margin:0 0 8px;"><strong>Amount:</strong> \${{amount}}</p>
    <p style="margin:0;"><strong>Date:</strong> {{donationDate}}</p>
  </td></tr>
</table>`;

export const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: EMAIL_TEMPLATE_KEYS.EMAIL_LAYOUT,
    name: 'Transactional Email Layout',
    category: 'General',
    subject: '{{orgName}} Notification',
    bodyHtml: buildDefaultEmailLayout(),
    bodyText: '{{content}}',
    description: 'Shared HTML wrapper for all outbound emails. Must include the {{content}} placeholder.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.APPLICATION_RECEIVED,
    name: 'Application Received (Applicant)',
    category: 'Application',
    subject: 'We received your {{applicationType}} application — #{{applicationId}}',
    bodyHtml: `<p>Hi {{applicantName}},</p><p>Thank you for submitting your {{applicationType}} application to {{orgName}}.</p><p><strong>Application ID:</strong> #{{applicationId}}</p><p><strong>Kitten of interest:</strong> {{kittenOfInterest}}</p><p>We will review your application and contact you soon.</p>`,
    bodyText:
      'Hi {{applicantName}},\n\nThank you for submitting your {{applicationType}} application to {{orgName}}.\n\nApplication ID: #{{applicationId}}\nKitten of interest: {{kittenOfInterest}}\n\nWe will review your application and contact you soon.',
    description: 'Sent automatically to the applicant when a new application is submitted.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.APPLICATION_RECEIVED_ADMIN,
    name: 'Application Received (Admin Alert)',
    category: 'Application',
    subject: 'New {{applicationType}} application #{{applicationId}} from {{applicantName}}',
    bodyHtml:
      '<p>A new {{applicationType}} application was submitted.</p><p><strong>Application ID:</strong> #{{applicationId}}</p><p><strong>Applicant:</strong> {{applicantName}} ({{applicantEmail}})</p><p><strong>Kitten of interest:</strong> {{kittenOfInterest}}</p><p><strong>Status:</strong> {{applicationStatus}}</p>',
    bodyText:
      'A new {{applicationType}} application was submitted.\n\nApplication ID: #{{applicationId}}\nApplicant: {{applicantName}} ({{applicantEmail}})\nKitten of interest: {{kittenOfInterest}}\nStatus: {{applicationStatus}}',
    description: 'Sent automatically to the admin notification email when a new application arrives.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.APPLICATION_APPROVED,
    name: 'Application Approved',
    category: 'Application',
    subject: 'Your {{applicationType}} application has been approved — #{{applicationId}}',
    bodyHtml: approvedBody,
    bodyText:
      'Hi {{applicantName}},\n\nYour {{applicationType}} application (#{{applicationId}}) has been Approved.\n\nKitten of interest: {{kittenOfInterest}}\n\nNotes: {{reviewNotes}}\n\nThank you,\n{{orgName}}',
    description: 'Sent to the applicant when an admin sets status to Approved.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.APPLICATION_DENIED,
    name: 'Application Denied',
    category: 'Application',
    subject: 'Update on your {{applicationType}} application — #{{applicationId}}',
    bodyHtml: deniedBody,
    bodyText:
      'Hi {{applicantName}},\n\nYour {{applicationType}} application (#{{applicationId}}) has been Denied.\n\nReason: {{denialReason}}\n\n{{orgName}}',
    description: 'Sent to the applicant when an admin sets status to Denied.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.APPLICATION_UNDER_REVIEW,
    name: 'Application Under Review',
    category: 'Application',
    subject: 'Your {{applicationType}} application is under review — #{{applicationId}}',
    bodyHtml: underReviewBody,
    bodyText:
      'Hi {{applicantName}},\n\nYour {{applicationType}} application (#{{applicationId}}) is Under Review.\n\nNotes: {{reviewNotes}}\n\n{{orgName}}',
    description: 'Sent to the applicant when an admin sets status to Under Review.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.APPLICATION_STATUS_CHANGED,
    name: 'Application Status Updated (Generic Fallback)',
    category: 'Application',
    subject: 'Your {{applicationType}} application status is now {{applicationStatus}}',
    bodyHtml:
      '<p>Hi {{applicantName}},</p><p>Your {{applicationType}} application (#{{applicationId}}) with {{orgName}} has been updated to: <strong>{{applicationStatus}}</strong>.</p><p>{{reviewNotes}}</p>',
    bodyText:
      'Hi {{applicantName}},\n\nYour {{applicationType}} application (#{{applicationId}}) with {{orgName}} has been updated to: {{applicationStatus}}.\n\n{{reviewNotes}}',
    description: 'Fallback template if a status-specific template is inactive.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.DONATION_RECEIVED,
    name: 'Donation Thank You',
    category: 'Donation',
    subject: 'Thank you for your donation to {{orgName}}',
    bodyHtml: donationThankYouBody,
    bodyText:
      'Hi {{donorName}},\n\nThank you for your generous donation of ${{amount}} to {{orgName}} on {{donationDate}}.\n\nYour support helps us rescue and care for kittens in need.',
    description: 'Sent automatically to the donor after a donation is recorded.',
    isSystem: true,
  },
  {
    key: EMAIL_TEMPLATE_KEYS.DONATION_RECEIVED_ADMIN,
    name: 'Donation Received (Admin Alert)',
    category: 'Donation',
    subject: 'New donation of ${{amount}} from {{donorName}}',
    bodyHtml: donationAdminBody,
    bodyText:
      'A new donation was received.\n\nDonor: {{donorName}} ({{donorEmail}})\nAmount: ${{amount}}\nDate: {{donationDate}}',
    description: 'Sent automatically to the admin notification email when a donation is recorded.',
    isSystem: true,
  },
];

export const TEMPLATE_VARIABLES = {
  Application: [
    '{{applicantName}}',
    '{{applicantEmail}}',
    '{{applicationId}}',
    '{{applicationType}}',
    '{{applicationStatus}}',
    '{{kittenOfInterest}}',
    '{{reviewNotes}}',
    '{{denialReason}}',
    '{{statusNotes}}',
    '{{orgName}}',
  ],
  Donation: ['{{donorName}}', '{{donorEmail}}', '{{amount}}', '{{donationDate}}', '{{orgName}}'],
  General: ['{{orgName}}', '{{content}}'],
};
