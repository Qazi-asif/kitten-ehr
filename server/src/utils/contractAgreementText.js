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

  return renderAgreementBody(bodyText, buildAgreementVariables(contract, kitten));
}
