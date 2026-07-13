import prisma from '../lib/prisma.js';
import { DEFAULT_AGREEMENT_TEMPLATES, getDefaultTemplateBySlug } from '../constants/defaultAgreementTemplates.js';

const BLANK = '________________';

export function buildAgreementVariables(contract, kitten = null) {
  const phoneEmail = [contract.signerPhone, contract.signerEmail].filter(Boolean).join(' / ');
  return {
    signerName: contract.signerName?.trim() || BLANK,
    signerEmail: contract.signerEmail?.trim() || BLANK,
    signerPhone: contract.signerPhone?.trim() || BLANK,
    signerAddress: contract.signerAddress?.trim() || BLANK,
    signerPhoneEmail: phoneEmail || BLANK,
    kittenName: contract.kittenName?.trim() || kitten?.name || BLANK,
    microchipNumber: contract.microchipNumber?.trim() || kitten?.microchipNumber?.trim() || BLANK,
    // Foster Care Agreement only (see schema comment on Contract.emergencyContactName) -
    // always '' rather than null on Adoption contracts, so this renders as BLANK
    // if a Foster template placeholder is ever used on an Adoption template by mistake.
    emergencyContactName: contract.emergencyContactName?.trim() || BLANK,
    emergencyContactPhone: contract.emergencyContactPhone?.trim() || BLANK,
    version: contract.documentVersion?.trim() || '2026.1',
  };
}

export function renderAgreementBody(bodyText, variables) {
  if (!bodyText) return '';
  return bodyText.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value == null || value === '' ? BLANK : String(value);
  });
}

export async function ensureAgreementTemplatesSeeded() {
  const count = await prisma.contractTemplate.count();
  if (count > 0) return;

  await prisma.contractTemplate.createMany({
    data: DEFAULT_AGREEMENT_TEMPLATES.map((template) => ({
      slug: template.slug,
      type: template.type,
      label: template.label,
      version: template.version,
      bodyText: template.bodyText,
    })),
  });
}

export async function getAgreementTemplateBySlug(slug) {
  await ensureAgreementTemplatesSeeded();
  const stored = await prisma.contractTemplate.findUnique({ where: { slug } });
  if (stored) return stored;

  const fallback = getDefaultTemplateBySlug(slug);
  if (!fallback) return null;

  return prisma.contractTemplate.create({
    data: {
      slug: fallback.slug,
      type: fallback.type,
      label: fallback.label,
      version: fallback.version,
      bodyText: fallback.bodyText,
    },
  });
}

export async function buildContractAgreementText(contract, options = {}) {
  const kitten = options.kitten ?? (contract.kittenId
    ? await prisma.kitten.findUnique({
      where: { id: contract.kittenId },
      select: { name: true, microchipNumber: true },
    })
    : null);

  const template = await getAgreementTemplateBySlug(
    contract.templateSlug || (contract.type === 'ADOPTION' ? 'adoption' : 'foster_supplies_provided'),
  );

  const bodyText = template?.bodyText
    || getDefaultTemplateBySlug(contract.templateSlug)?.bodyText
    || '';

  const variables = buildAgreementVariables(contract, kitten);

  // TEMPORARY DEBUG - remove after diagnosing the blank-placeholder bug.
  console.log('[DEBUG-CONTRACT-SUBSTITUTION-SERVER]', {
    contractId: contract.id,
    contractTemplateSlug: contract.templateSlug,
    resolvedTemplateId: template?.id ?? null,
    resolvedTemplateSlug: template?.slug ?? null,
    resolvedTemplateUpdatedAt: template?.updatedAt ?? null,
    rawSignerName: contract.signerName,
    rawSignerEmail: contract.signerEmail,
    rawSignerAddress: contract.signerAddress,
    rawSignerPhone: contract.signerPhone,
    variables,
    bodyTextPreview: bodyText.slice(0, 200),
  });

  return renderAgreementBody(bodyText, variables);
}

// TEMPORARY DEBUG - remove after diagnosing the blank-placeholder bug.
// Returns the same diagnostic info as the console.log above, but as data, so
// a caller can attach it to an API response and inspect it in the browser
// console without needing access to server-side logs.
export async function debugAgreementTextInputs(contract, options = {}) {
  const kitten = options.kitten ?? (contract.kittenId
    ? await prisma.kitten.findUnique({
      where: { id: contract.kittenId },
      select: { name: true, microchipNumber: true },
    })
    : null);

  const slug = contract.templateSlug || (contract.type === 'ADOPTION' ? 'adoption' : 'foster_supplies_provided');
  const template = await getAgreementTemplateBySlug(slug);
  const variables = buildAgreementVariables(contract, kitten);

  return {
    contractId: contract.id,
    contractTemplateSlug: contract.templateSlug,
    resolvedTemplateId: template?.id ?? null,
    resolvedTemplateSlug: template?.slug ?? null,
    resolvedTemplateUpdatedAt: template?.updatedAt ?? null,
    rawSignerName: contract.signerName,
    rawSignerEmail: contract.signerEmail,
    rawSignerAddress: contract.signerAddress,
    rawSignerPhone: contract.signerPhone,
    variables,
    bodyTextPreview: (template?.bodyText || getDefaultTemplateBySlug(slug)?.bodyText || '').slice(0, 200),
  };
}
