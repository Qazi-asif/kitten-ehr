import { useMemo } from 'react';
import {
  formatApplicationFieldLabel,
  getApplicationDetailFields,
  getApplicationSummary,
  getHouseholdPets,
  resolveKittenOfInterest,
} from '../../utils/applicationFormData';

const STATUS_OPTIONS = ['New', 'Under Review', 'Approved', 'Denied'];

function ApplicationDetailPanel({ application, onClose, onStatusChange, saving = false }) {
  const fields = useMemo(
    () => getApplicationDetailFields(application?.formData, application?.type),
    [application?.formData, application?.type],
  );

  const kittenOfInterest = useMemo(
    () => resolveKittenOfInterest(application?.formData, application?.kittenOfInterest),
    [application?.formData, application?.kittenOfInterest],
  );

  const householdPets = useMemo(
    () => getHouseholdPets(application?.formData),
    [application?.formData],
  );

  if (!application) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
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
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      <label className="mt-5 block max-w-sm">
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
        <p className="mt-4 text-sm text-gray-500">No additional application details recorded.</p>
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

      {householdPets.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Current Pets in Household</h3>
          <div className="mt-4 space-y-3">
            {householdPets.map((pet, index) => (
              <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">Pet {index + 1}: {pet.name || 'Unnamed'}</p>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div><span className="text-gray-500">Species:</span> {pet.species || '—'}</div>
                  <div><span className="text-gray-500">Age:</span> {pet.age || '—'}</div>
                  <div><span className="text-gray-500">Fixed:</span> {pet.fixed || '—'}</div>
                  <div><span className="text-gray-500">Good with Other Animals:</span> {pet.goodWithOtherAnimals || '—'}</div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default ApplicationDetailPanel;
