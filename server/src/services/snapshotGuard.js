export function evaluateSnapshotGuard({ rowCount, lastSuccessfulCount = 0, override = false } = {}) {
  const count = Number(rowCount) || 0;
  const previous = Number(lastSuccessfulCount) || 0;

  if (count <= 0 && !override) {
    return {
      ok: false,
      reason: 'empty',
      message: 'Snapshot has zero cats. Upload blocked unless a human override is provided.',
    };
  }

  if (previous > 0 && count < previous * 0.5 && !override) {
    return {
      ok: false,
      reason: 'shrink',
      message: `Snapshot has ${count} cats, more than 50% smaller than the last successful run (${previous}). Upload blocked unless a human override is provided.`,
    };
  }

  return { ok: true, reason: override ? 'override' : 'ok' };
}

export function nextBackoffMinutes(attempts) {
  const n = Math.max(1, Number(attempts) || 1);
  return Math.min(30, 2 ** (n - 1));
}
