export function parseSignatureAudit(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function resolveContractSignatureImage(contract) {
  const audit = parseSignatureAudit(contract?.signatureAudit);
  return contract?.signedPdfUrl || audit.signatureImage || '';
}

export function resolveContractKittenName(contract) {
  return contract?.kittenName || contract?.kitten?.name || contract?.application?.kittenOfInterest || '—';
}
