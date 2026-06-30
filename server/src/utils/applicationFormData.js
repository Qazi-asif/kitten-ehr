export function parseApplicationFormData(formData) {
  if (!formData) return {};
  if (typeof formData === 'object' && !Array.isArray(formData)) return formData;
  if (typeof formData !== 'string') return {};

  try {
    let parsed = JSON.parse(formData);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function getApplicantEmail(formData) {
  const parsed = parseApplicationFormData(formData);
  return parsed.email?.trim() || '';
}

export function getApplicantName(formData) {
  const parsed = parseApplicationFormData(formData);
  return parsed.fullName || parsed.name || parsed.applicant || 'Applicant';
}
