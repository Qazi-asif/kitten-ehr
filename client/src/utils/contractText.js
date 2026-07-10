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
  return renderAgreementBody(bodyText, buildAgreementVariables(contract));
}

export function getDefaultContractText(contract, templates = []) {
  if (contract?.agreementText) return contract.agreementText;
  return getContractAgreementText(contract, templates);
}

export function listContractTemplateOptions() {
  return CONTRACT_TEMPLATES;
}

export function mergeTemplateOptions(apiTemplates = []) {
  if (!apiTemplates.length) return DEFAULT_AGREEMENT_TEMPLATES;
  return apiTemplates;
}
