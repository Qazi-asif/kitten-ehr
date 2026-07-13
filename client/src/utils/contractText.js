import { CONTRACT_TEMPLATES } from '../constants/contractTemplates';
import { DEFAULT_AGREEMENT_TEMPLATES, getDefaultTemplateBySlug } from '../constants/defaultAgreementTemplates';

const BLANK = '________________';

export function buildAgreementVariables(contract) {
  const phoneEmail = [contract?.signerPhone, contract?.signerEmail].filter(Boolean).join(' / ');
  return {
    signerName: contract?.signerName?.trim() || BLANK,
    signerEmail: contract?.signerEmail?.trim() || BLANK,
    signerPhone: contract?.signerPhone?.trim() || BLANK,
    signerAddress: contract?.signerAddress?.trim() || BLANK,
    signerPhoneEmail: phoneEmail || BLANK,
    kittenName: contract?.kittenName?.trim() || contract?.kitten?.name || BLANK,
    microchipNumber: contract?.microchipNumber?.trim() || contract?.kitten?.microchipNumber?.trim() || BLANK,
    // Foster Care Agreement only - mirrors the server-side buildAgreementVariables
    // in contractAgreementText.js exactly, used for the live preview before signing.
    emergencyContactName: contract?.emergencyContactName?.trim() || BLANK,
    emergencyContactPhone: contract?.emergencyContactPhone?.trim() || BLANK,
    version: contract?.documentVersion?.trim() || '2026.1',
  };
}

export function renderAgreementBody(bodyText, variables) {
  if (!bodyText) return '';
  return bodyText.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value == null || value === '' ? BLANK : String(value);
  });
}

function resolveTemplateBody(contract, templates = []) {
  const slug = contract?.templateSlug || 'foster_supplies_provided';
  const fromApi = templates.find((template) => template.slug === slug);
  if (fromApi?.bodyText) return fromApi.bodyText;
  return getDefaultTemplateBySlug(slug)?.bodyText || '';
}

export function getContractAgreementText(contract, templates = []) {
  const bodyText = resolveTemplateBody(contract, templates);
  const variables = buildAgreementVariables(contract);

  // TEMPORARY DEBUG - remove after diagnosing the blank-placeholder bug.
  // eslint-disable-next-line no-console
  console.log('[DEBUG-CONTRACT-SUBSTITUTION]', {
    contractId: contract?.id,
    templateSlug: contract?.templateSlug,
    rawSignerName: contract?.signerName,
    rawSignerEmail: contract?.signerEmail,
    rawSignerAddress: contract?.signerAddress,
    rawSignerPhone: contract?.signerPhone,
    rawEmergencyContactName: contract?.emergencyContactName,
    rawEmergencyContactPhone: contract?.emergencyContactPhone,
    resolvedVariables: variables,
    bodyTextPreview: bodyText.slice(0, 150),
  });

  return renderAgreementBody(bodyText, variables);
}

export function getDefaultContractText(contract, templates = []) {
  // Signed contracts with a frozen snapshot (captured at signing time, see
  // markContractSigned) always show that exact text, not a live re-render
  // of the current template - the whole point is that later template edits
  // don't retroactively change what a signed contract shows. Signed
  // contracts that predate this (no frozenAgreementText) fall through to
  // live rendering below, unchanged from prior behavior.
  if (contract?.status === 'SIGNED' && contract?.frozenAgreementText) {
    // TEMPORARY DEBUG - remove after diagnosing the blank-placeholder bug.
    // eslint-disable-next-line no-console
    console.log('[DEBUG-CONTRACT-SUBSTITUTION] using frozenAgreementText, contractId:', contract?.id);
    return contract.frozenAgreementText;
  }
  if (contract?.agreementText) {
    // TEMPORARY DEBUG - remove after diagnosing the blank-placeholder bug.
    // eslint-disable-next-line no-console
    console.log('[DEBUG-CONTRACT-SUBSTITUTION] using pre-attached contract.agreementText (server-computed), contractId:', contract?.id);
    return contract.agreementText;
  }
  return getContractAgreementText(contract, templates);
}

export function listContractTemplateOptions() {
  return CONTRACT_TEMPLATES;
}

export function mergeTemplateOptions(apiTemplates = []) {
  if (!apiTemplates.length) return DEFAULT_AGREEMENT_TEMPLATES;
  return apiTemplates;
}
