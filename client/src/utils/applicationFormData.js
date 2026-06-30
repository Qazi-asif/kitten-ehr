const FIELD_LABELS = {
  fullName: 'Full Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  kittenInterest: 'Kitten Interest',
  experience: 'Experience',
  household: 'Household',
  message: 'Additional Message',
  applicant: 'Applicant',
  kitten: 'Kitten',
  name: 'Name',
};

export function parseApplicationFormData(formData) {
  if (!formData) return {};

  if (typeof formData === 'object' && !Array.isArray(formData)) {
    return formData;
  }

  if (typeof formData !== 'string') {
    return { details: String(formData) };
  }

  try {
    let parsed = JSON.parse(formData);
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    return typeof parsed === 'object' && parsed !== null ? parsed : { details: String(parsed) };
  } catch {
    return { details: formData };
  }
}

export function formatApplicationFieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase());
}

export function getApplicationSummary(formData) {
  const parsed = parseApplicationFormData(formData);
  return parsed.fullName || parsed.applicant || parsed.name || parsed.email || 'Application';
}
