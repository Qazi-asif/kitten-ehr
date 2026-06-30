import { useEffect, useMemo, useState } from 'react';
import {
  getApplicationDisplaySections,
  getApplicationSummary,
  getHouseholdPets,
  resolveKittenOfInterest,
} from '../../utils/applicationFormData';

const STATUS_OPTIONS = ['New', 'Under Review', 'Approved', 'Denied'];

function FieldGrid({ fields }) {
  return (
    <dl className="mt-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
      {fields.map((field) => (
        <div key={field.key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]">
          <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
          <dd className="whitespace-pre-wrap break-words text-sm text-gray-900">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ApplicationDetailPanel({ application, onClose, onStatusUpdate, saving = false }) {
  const [pendingStatus, setPendingStatus] = useState(application?.status || 'New');
  const [statusNotes, setStatusNotes] = useState(application?.statusNotes || '');

  useEffect(() => {
    setPendingStatus(application?.status || 'New');
    setStatusNotes(application?.statusNotes || '');
  }, [application?.id, application?.status, application?.statusNotes]);

  const kittenOfInterest = useMemo(
    () => resolveKittenOfInterest(application?.formData, application?.kittenOfInterest),
    [application?.formData, application?.kittenOfInterest],
  );

  const householdPets = useMemo(
    () => getHouseholdPets(application?.formData),
    [application?.formData],
  );

  const sections = useMemo(
    () => getApplicationDisplaySections(application?.formData, application?.type),
    [application?.formData, application?.type],
  );

  const hasChanges =
    pendingStatus !== application?.status || statusNotes !== (application?.statusNotes || '');

  if (!application) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{application.type} Application</p>
          <h2 className="mt-1 text-xl font-bold text-gray-900">{getApplicationSummary(application.formData)}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Application #{application.id} · Submitted {new Date(application.createdAt).toLocaleString()}
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

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <select
            value={pendingStatus}
            onChange={(e) => setPendingStatus(e.target.value)}
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Email notifications</p>
          <p className="mt-1 text-emerald-800">
            Setting status to Approved, Denied, or Under Review sends a branded email to the applicant.
          </p>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-gray-700">
          Review Notes {pendingStatus === 'Denied' ? '(reason for denial)' : ''}
        </span>
        <textarea
          rows={4}
          value={statusNotes}
          onChange={(e) => setStatusNotes(e.target.value)}
          disabled={saving}
          placeholder={
            pendingStatus === 'Denied'
              ? 'Explain why the application was denied. This is included in the applicant email.'
              : 'Optional notes included in the applicant notification email.'
          }
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
        />
      </label>

      <button
        type="button"
        disabled={saving || !hasChanges}
        onClick={() => onStatusUpdate(application.id, { status: pendingStatus, statusNotes })}
        className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Update Status & Notify Applicant'}
      </button>

      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{section.title}</h3>
            <FieldGrid fields={section.fields} />
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Kitten of Interest</h3>
          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
            {kittenOfInterest ? (
              <p className="text-base font-semibold text-gray-900">{kittenOfInterest}</p>
            ) : (
              <p className="text-sm text-gray-500">Unspecified</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Current Pets in Household</h3>
          {householdPets.length === 0 ? (
            <p className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              No household pets listed.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
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
          )}
        </div>
      </div>
    </section>
  );
}

export default ApplicationDetailPanel;
