import { useMemo } from 'react';
import { X } from 'lucide-react';
import {
  formatApplicationFieldLabel,
  getApplicationDetailFields,
  getApplicationSummary,
  resolveKittenOfInterest,
} from '../../utils/applicationFormData';

const STATUS_OPTIONS = ['New', 'Under Review', 'Approved', 'Denied'];

function ApplicationDetailModal({ application, onClose, onStatusChange, saving = false }) {
  const fields = useMemo(
    () => getApplicationDetailFields(application?.formData, application?.type),
    [application?.formData, application?.type],
  );

  const kittenOfInterest = useMemo(
    () => resolveKittenOfInterest(application?.formData, application?.kittenOfInterest),
    [application?.formData, application?.kittenOfInterest],
  );

  if (!application) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{application.type} Application</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{getApplicationSummary(application.formData)}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Submitted {new Date(application.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close application details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <select
              value={application.status}
              onChange={(e) => onStatusChange(application.id, e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Kitten of Interest</p>
            {kittenOfInterest ? (
              <p className="mt-1 text-base font-semibold text-gray-900">{kittenOfInterest}</p>
            ) : (
              <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                Unspecified
              </span>
            )}
          </div>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Full Application</h3>

          {fields.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No application details were recorded.</p>
          ) : (
            <dl className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
              {fields.map(([key, value]) => (
                <div key={key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]">
                  <dt className="text-sm font-medium text-gray-500">{formatApplicationFieldLabel(key)}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm text-gray-900">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApplicationDetailModal;
