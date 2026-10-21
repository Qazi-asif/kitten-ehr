export function scopesToOwnCats(req) {
  return Boolean(req?.user?.role?.scopesToOwnCats);
}

export function kittenOwnerWhere(req) {
  if (!scopesToOwnCats(req) || !req?.user?.id) return {};
  return { createdByUserId: req.user.id };
}

export function mergeKittenWhere(base = {}, ownerWhere = {}) {
  const hasOwner = ownerWhere && Object.keys(ownerWhere).length > 0;
  if (!hasOwner) return base;
  const hasBase = base && Object.keys(base).length > 0;
  if (!hasBase) return ownerWhere;
  return { AND: [base, ownerWhere] };
}

export function formatExternalId(id) {
  return `PT-${String(id).padStart(6, '0')}`;
}
