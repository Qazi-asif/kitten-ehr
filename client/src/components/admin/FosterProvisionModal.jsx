import { useEffect, useState } from 'react';
import { PawPrint } from 'lucide-react';
import { provisionFosterFromApplication } from '../../services/api';
import { CAPABILITY_OPTIONS, EXPERIENCE_LEVELS, parseCapabilityFlags } from '../../utils/fosterCapabilities';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  experienceLevel: 'Beginner',
  maxKittens: 0,
  emergencyContact: '',
  notes: '',
  createPortalAccount: true,
};

// Confirmation modal for the Foster-application approval auto-provision
// feature (see foster-auto-provision-plan.md). Self-contained: watches
// application.fosterProvisionPreview (returned by updateApplicationStatus
// only on a genuine Foster-type Approved transition) and opens itself when
// a *new* preview object arrives - not on every re-render, since the effect
// dependency only changes reference on a fresh network response. Staff
// always confirm or skip; nothing here fires automatically.
function FosterProvisionModal({ application }) {
  const preview = application?.fosterProvisionPreview;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [capabilities, setCapabilities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (preview) {
      setForm({
        name: preview.mapped.name,
        phone: preview.mapped.phone,
        email: preview.mapped.email,
        address: preview.mapped.address,
        experienceLevel: preview.mapped.experienceLevel || 'Beginner',
        maxKittens: preview.mapped.maxKittens,
        emergencyContact: preview.mapped.emergencyContact,
        notes: preview.mapped.notes,
        createPortalAccount: true,
      });
      setCapabilities(parseCapabilityFlags(preview.mapped.capabilityFlags));
      setError('');
      setResult(null);
      setOpen(true);
    }
    // Intentionally keyed on the preview object reference only - a fresh
    // object only ever arrives from a new updateApplicationStatus response,
    // never from an unrelated re-render of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  if (!open || !preview) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleCapability(value) {
    setCapabilities((prev) =>
      prev.includes(value) ? prev.filter((flag) => flag !== value) : [...prev, value],
    );
  }

  function close() {
    setOpen(false);
    setResult(null);
    setError('');
  }

  async function submit(payload) {
    setSaving(true);
    setError('');
    try {
      const response = await provisionFosterFromApplication(preview.applicationId, payload);
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCreateSubmit(e) {
    e.preventDefault();
    submit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      experienceLevel: form.experienceLevel,
      capabilityFlags: capabilities.join(','),
      maxKittens: Number.parseInt(form.maxKittens, 10) || 0,
      emergencyContact: form.emergencyContact.trim(),
      notes: form.notes.trim(),
      createPortalAccount: form.createPortalAccount,
    });
  }

  function handleSendInviteToExisting() {
    submit({
      name: preview.mapped.name,
      phone: preview.mapped.phone,
      email: preview.mapped.email,
      address: preview.mapped.address,
      experienceLevel: preview.mapped.experienceLevel || 'Beginner',
      capabilityFlags: preview.mapped.capabilityFlags,
      maxKittens: preview.mapped.maxKittens,
      emergencyContact: preview.mapped.emergencyContact,
      notes: preview.mapped.notes,
      createPortalAccount: true,
    });
  }

  const hasExistingFoster = Boolean(preview.existingFoster);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={saving ? undefined : close} aria-hidden="true" />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <PawPrint className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-bold text-slate-900">
            {hasExistingFoster ? 'Foster record already exists' : 'Create Foster record?'}
          </h2>
        </div>

        {result ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {result.fosterWasExisting
                ? `Matched the existing Foster record (${result.foster.name}).`
                : `Foster record created for ${result.foster.name}.`}
            </div>
            {result.portalAccount && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  result.portalAccount.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                }`}
              >
                {result.portalAccount.ok
                  ? 'Portal account created and the set-password invite email was sent.'
                  : `Portal account not created: ${result.portalAccount.reason}`}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Close
              </button>
            </div>
          </div>
        ) : hasExistingFoster ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              A Foster record already exists for{' '}
              <span className="font-semibold text-slate-900">{preview.existingFoster.name}</span>{' '}
              ({preview.existingFoster.email}). No new Foster record will be created.
            </p>
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            {preview.existingFosterHasPortalAccount ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                This foster already has a portal account — no action needed.
              </p>
            ) : (
              <p className="text-sm text-slate-600">Send the portal invite to this existing record?</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {preview.existingFosterHasPortalAccount ? 'Close' : 'Skip'}
              </button>
              {!preview.existingFosterHasPortalAccount && (
                <button
                  type="button"
                  onClick={handleSendInviteToExisting}
                  disabled={saving}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {saving ? 'Sending...' : 'Send Portal Invite'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              This application was just approved. Review the details below before creating a Foster record.
            </p>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Name</span>
                <input name="name" value={form.name} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Phone</span>
                <input name="phone" value={form.phone} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Email</span>
                <input type="email" name="email" value={form.email} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Address</span>
                <input name="address" value={form.address} onChange={handleChange} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Experience Level</span>
                <select name="experienceLevel" value={form.experienceLevel} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-400">Auto-translated from the application's answer — review before submitting.</span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-slate-500">Max Kittens Capacity</span>
                <input type="number" min="0" max="50" name="maxKittens" value={form.maxKittens} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <span className="mt-1 block text-xs text-slate-400">Not collected on the application.</span>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Emergency Contact</span>
                <input name="emergencyContact" value={form.emergencyContact} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <span className="mt-1 block text-xs text-slate-400">Not collected on the application.</span>
              </label>

              <fieldset className="sm:col-span-2">
                <legend className="text-xs font-semibold uppercase text-slate-500">Capabilities</legend>
                <p className="mt-1 text-xs text-slate-400">Auto-translated from the application's answer — review before submitting.</p>
                <div className="mt-2 flex flex-wrap gap-4">
                  {CAPABILITY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={capabilities.includes(option.value)}
                        onChange={() => toggleCapability(option.value)}
                        className="rounded border-slate-300"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase text-slate-500">Notes</span>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.createPortalAccount}
                  onChange={(e) => setForm((prev) => ({ ...prev, createPortalAccount: e.target.checked }))}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span>
                  Also create the portal account and send the set-password invite email
                  <span className="block text-xs text-slate-500">
                    Sends {form.email || 'the email above'} a link to set up limited-access Foster Portal login.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Skip — I&apos;ll add this Foster manually later
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? 'Creating...' : 'Create Foster Record + Send Portal Invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default FosterProvisionModal;
