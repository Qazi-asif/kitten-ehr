import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_TEMPLATE_KEYS } from '../src/constants/emailTemplates.js';

// One-off fix for the missing/inactive foster.portal.set_password
// EmailTemplate row - tonight's investigation confirmed via Email Logs that
// every foster-portal invite send was recorded as
// "skipped - template missing/inactive", because getActiveTemplate() in
// emailService.js requires an active EmailTemplate row matching this key
// and none exists. The generic "Send Test Email" button works fine because
// it's a completely separate code path that never looks up a template.
//
// Pulls the canonical definition straight from DEFAULT_EMAIL_TEMPLATES
// (emailTemplates.js) instead of retyping it, so there is zero chance of
// drifting from what the app actually ships. Upserts on `key` - the same
// pattern prisma/seed.js's seedEmailTemplates() already uses for every
// template - rather than a bare create, so this script is safe to re-run:
// if the row turns out to already exist, it only flips isActive back to
// true and leaves subject/bodyHtml/bodyText untouched, in case someone had
// already customized the content. This does NOT run the full seed script -
// it touches only this one row.
const KEY = EMAIL_TEMPLATE_KEYS.FOSTER_PORTAL_SET_PASSWORD;

const template = DEFAULT_EMAIL_TEMPLATES.find((t) => t.key === KEY);
if (!template) {
  throw new Error(`No default template definition found for key "${KEY}" in emailTemplates.js`);
}

console.log(`=== Upserting EmailTemplate "${KEY}" ===\n`);
console.log(JSON.stringify(template, null, 2));

const before = await prisma.emailTemplate.findUnique({ where: { key: KEY } });
console.log(`\nRow before: ${before ? `exists (id=${before.id}, isActive=${before.isActive})` : 'does not exist'}`);

const result = await prisma.emailTemplate.upsert({
  where: { key: KEY },
  create: template,
  update: { isActive: true },
});

console.log(`\nRow after:  exists (id=${result.id}, isActive=${result.isActive}, isSystem=${result.isSystem})`);

// Re-run the exact query getActiveTemplate() uses in emailService.js, so a
// pass here genuinely proves the real send path will find this template -
// not just that "a row exists somewhere".
const verify = await prisma.emailTemplate.findFirst({ where: { key: KEY, isActive: true } });

if (verify) {
  console.log(`\n✅ SUCCESS: "${KEY}" is now active. sendTemplatedEmail() will find it on the next foster-portal invite.`);
} else {
  console.error(`\n❌ FAILED: "${KEY}" still not found as an active template after upsert. Do not assume this is fixed - investigate before relying on it.`);
}

await prisma.$disconnect();
