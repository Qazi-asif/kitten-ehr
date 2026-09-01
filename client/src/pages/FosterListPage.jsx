import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FosterForm from '../components/FosterForm';
import { createFoster, activateFoster, deactivateFoster, deleteFoster, fetchFosters } from '../services/api';
import { buildCapabilityFlags, fileToDataUrl, parseCapabilityFlags } from '../utils/fosterCapabilities';

function FosterListPage() {
  const [fosters, setFosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const loadFosters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFosters();
      setFosters(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFosters();
  }, [loadFosters]);

  async function handleCreateFoster({ photoFile, capabilities, ...formData }) {
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const photoUrl = photoFile ? await fileToDataUrl(photoFile) : null;
      const created = await createFoster({
        ...formData,
        capabilityFlags: buildCapabilityFlags(capabilities, formData.maxKittens),
        photoUrl,
      });

      // portalAccount is only present when the "Also create a portal
      // account" checkbox was on; ok:false means the Foster itself was
      // still created successfully, just not the linked account (e.g. no
      // Foster Portal role configured yet, or the email's already in use).
      // ok:true only confirms the portal User + set-password token were
      // created - the invite email itself is sent fire-and-forget by
      // provisionFosterPortalAccount (see that file's comment) and its
      // result never reaches this response, so this message must not
      // assert delivery as a confirmed fact. Failures land in EmailLog
      // for staff to check under Settings -> Email Logs.
      if (created?.portalAccount && !created.portalAccount.ok) {
        setNotice(`Foster created, but no portal account was set up: ${created.portalAccount.reason}`);
      } else if (created?.portalAccount?.ok) {
        setNotice('Foster created, and the portal account was set up. The invite email is being sent.');
      }

      await loadFosters();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivateFoster(foster) {
    const confirmed = window.confirm(`Deactivate ${foster.name}? They will be marked inactive and hidden from new placement assignment.`);
    if (!confirmed) return;

    setError(null);
    try {
      await deactivateFoster(foster.id);
      await loadFosters();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleActivateFoster(foster) {
    const confirmed = window.confirm(`Re-activate ${foster.name}? They will be available for new placements again.`);
    if (!confirmed) return;

    setError(null);
    try {
      await activateFoster(foster.id);
      await loadFosters();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFoster(foster) {
    const confirmed = window.confirm(
      `Permanently delete ${foster.name}? This cannot be undone and removes their placement history.`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      await deleteFoster(foster.id);
      await loadFosters();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Foster Homes</h1>
        <p className="mt-1 text-sm text-slate-500">Manage foster contacts, capacity, and placement history.</p>
      </div>

      <FosterForm onSubmit={handleCreateFoster} submitting={submitting} />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</div>}
      {loading && <p className="text-slate-500">Loading fosters...</p>}

      {!loading && !error && fosters.length === 0 && (
        <p className="rounded-lg bg-slate-100 px-4 py-6 text-center text-slate-600">
          No fosters found yet.
        </p>
      )}

      {!loading && !error && fosters.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Experience</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Capabilities</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Active</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {fosters.map((foster) => (
                <tr key={foster.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                    <Link to={`/admin/fosters/${foster.id}`} className="text-brand hover:underline">
                      {foster.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div>{foster.phone}</div>
                    <div className="text-slate-500">{foster.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{foster.experienceLevel || '—'}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                    {foster._count?.currentKittens ?? 0}
                    {foster.maxKittens ? ` / ${foster.maxKittens}` : ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {parseCapabilityFlags(foster.capabilityFlags).length > 0
                      ? parseCapabilityFlags(foster.capabilityFlags).length
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{foster._count?.currentKittens ?? 0}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${foster.isActive === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                      {foster.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className="min-w-[6.5rem] px-4 py-4 text-sm">
                    <div className="flex flex-col items-start gap-1.5">
                      <Link
                        to={`/admin/fosters/${foster.id}`}
                        className="inline-flex max-w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Dashboard
                      </Link>
                      {foster.isActive !== false && (
                        <button
                          type="button"
                          onClick={() => handleDeactivateFoster(foster)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                      {foster.isActive === false && (
                        <button
                          type="button"
                          onClick={() => handleActivateFoster(foster)}
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          Re-activate
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteFoster(foster)}
                        className="text-xs font-medium text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default FosterListPage;
