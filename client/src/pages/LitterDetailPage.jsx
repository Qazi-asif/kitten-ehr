import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  activateLitter,
  deactivateLitter,
  fetchLitterById,
  updateLitter,
} from '../services/api';
import { formatPacificDisplay, toPacificDateString } from '../utils/pacificDate';

const statusBadgeClass = {
  'In Foster Care': 'bg-emerald-100 text-emerald-800',
  'Available for Adoption': 'bg-blue-100 text-blue-800',
  Adopted: 'bg-purple-100 text-purple-800',
  Transferred: 'bg-gray-100 text-gray-700',
  Deceased: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }) {
  const badgeClass = statusBadgeClass[status] ?? 'bg-gray-100 text-gray-700';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>{status}</span>;
}

function formatDate(value) {
  return formatPacificDisplay(value) || '—';
}

function buildLitterForm(litter) {
  return {
    name: litter.name || '',
    intakeDate: litter.intakeDate ? toPacificDateString(litter.intakeDate) : '',
    notes: litter.notes || '',
  };
}

function LitterDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canManageLitter = hasPermission('litters.manage');
  const [litter, setLitter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [litterForm, setLitterForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const loadLitter = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLitterById(id);
      setLitter(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLitter();
  }, [loadLitter]);

  function openEdit() {
    setLitterForm(buildLitterForm(litter));
    setEditing(true);
  }

  function handleFieldChange(field, value) {
    setLitterForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateLitter(id, {
        name: litterForm.name.trim(),
        intakeDate: litterForm.intakeDate.trim() || null,
        notes: litterForm.notes,
      });
      setLitter((prev) => ({ ...prev, ...updated }));
      setEditing(false);
      setLitterForm(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!litter) return;
    const isActive = litter.isActive !== false;
    const confirmed = window.confirm(
      isActive
        ? `Deactivate ${litter.name}? The litter will be marked inactive but not deleted.`
        : `Re-activate ${litter.name}? It will appear in active litter lists again.`,
    );
    if (!confirmed) return;

    setTogglingActive(true);
    setError(null);
    try {
      const updated = isActive
        ? await deactivateLitter(id)
        : await activateLitter(id);
      setLitter((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingActive(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading litter...</p>;

  if (error && !litter) {
    return (
      <div>
        <Link to="/admin/litters" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">← Back to litters</Link>
        <p className="mt-4 text-red-600">{error}</p>
      </div>
    );
  }

  const isActive = litter.isActive !== false;

  return (
    <div>
      <Link to="/admin/litters" className="inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-900">← Back to litters</Link>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">{litter.name}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        {canManageLitter && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openEdit}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit Litter
            </button>
            {isActive ? (
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={togglingActive}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {togglingActive ? 'Deactivating...' : 'Deactivate'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={togglingActive}
                className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                {togglingActive ? 'Re-activating...' : 'Re-activate'}
              </button>
            )}
          </div>
        )}
      </div>

      {editing && litterForm && (
        <form onSubmit={handleSave} className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-bold text-slate-900">Edit Litter Details</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
              <input
                value={litterForm.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Intake Date</span>
              <input
                type="date"
                value={litterForm.intakeDate}
                onChange={(e) => handleFieldChange('intakeDate', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">Notes</span>
              <textarea
                value={litterForm.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setEditing(false); setLitterForm(null); }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Intake Date</p>
          <p className="mt-1 font-semibold text-gray-900">{formatDate(litter.intakeDate)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Linked Kittens</p>
          <p className="mt-1 font-semibold text-gray-900">{litter.kittens.length}</p>
        </div>
      </div>

      {litter.notes && !editing && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Notes</h2>
          <p className="text-gray-600">{litter.notes}</p>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Kittens in this litter</h2>
        </div>
        {litter.kittens.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500">No kittens linked yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Breed</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Foster</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {litter.kittens.map((kitten) => (
                <tr key={kitten.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">
                    <Link to={`/admin/kittens/${kitten.id}`} className="text-emerald-700 hover:underline">{kitten.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm"><StatusBadge status={kitten.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-600">{kitten.breed}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{kitten.currentFoster?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm">
                    <Link to={`/admin/kittens/${kitten.id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default LitterDetailPage;
