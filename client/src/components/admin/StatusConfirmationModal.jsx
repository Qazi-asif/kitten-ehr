import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { KITTEN_STATUS_OPTIONS } from '../../constants/kittenStatuses';

// Shared confirmation prompt for any workflow action that plausibly changes a
// kitten's status (contract signing, foster placement start/end). Never
// writes a status change automatically - staff always confirm or skip.
function StatusConfirmationModal({
  open,
  kittenName,
  currentStatus,
  suggestedStatus,
  reason,
  onConfirm,
  onSkip,
  saving = false,
}) {
  const [selectedStatus, setSelectedStatus] = useState(suggestedStatus || currentStatus || KITTEN_STATUS_OPTIONS[0]);

  useEffect(() => {
    if (open) {
      setSelectedStatus(suggestedStatus || currentStatus || KITTEN_STATUS_OPTIONS[0]);
    }
  }, [open, suggestedStatus, currentStatus]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onSkip} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-slate-900">Update kitten status?</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {reason || 'This action may affect '}
          {kittenName ? <span className="font-semibold text-slate-900">{kittenName}</span> : 'this kitten'}
          's status.
        </p>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Current status: {currentStatus || 'Unknown'}</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            {KITTEN_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedStatus)}
            disabled={saving}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Status'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatusConfirmationModal;
