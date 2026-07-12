// Best-effort split of a single "full name" field into firstName/lastName.
// Needed because Foster only stores one free-text name field, while User
// requires firstName/lastName separately - a gap that only became a
// problem once User rows started getting derived from Foster rows for
// portal accounts. Display-only, never used on any legal document or
// contract signature, so an imperfect split for multi-word or
// multi-surname names is a cosmetic risk, not a functional one.
export function splitFullName(fullName) {
  const trimmed = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return { firstName: '', lastName: '' };

  const parts = trimmed.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}
