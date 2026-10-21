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

export function applicationMatchesOwnedKittens(application, ownedKittens = []) {
  if (!ownedKittens.length) return false;

  const ids = new Set(ownedKittens.map((kitten) => kitten.id));
  const names = new Set(
    ownedKittens.map((kitten) => String(kitten.name || '').trim().toLowerCase()).filter(Boolean),
  );
  const externals = new Set(
    ownedKittens
      .map((kitten) => String(kitten.externalId || '').trim().toLowerCase())
      .filter(Boolean),
  );

  const matchesToken = (raw) => {
    const token = String(raw || '').trim().toLowerCase();
    if (!token) return false;
    if (names.has(token) || externals.has(token)) return true;
    const asId = Number.parseInt(token, 10);
    return Number.isInteger(asId) && ids.has(asId);
  };

  if (matchesToken(application?.kittenOfInterest)) return true;

  let form = application?.formData;
  if (typeof form === 'string') {
    try {
      form = JSON.parse(form);
    } catch {
      form = {};
    }
  }
  if (form && typeof form === 'object') {
    const formId = Number.parseInt(form.kittenId, 10);
    if (Number.isInteger(formId) && ids.has(formId)) return true;
    if (matchesToken(form.kittenOfInterest) || matchesToken(form.kitten) || matchesToken(form.cat)) {
      return true;
    }
  }

  return false;
}
