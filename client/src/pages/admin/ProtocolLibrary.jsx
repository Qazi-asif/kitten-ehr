import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createProtocol, fetchProtocols } from '../../services/protocolApi';

const emptyDrug = {
  drugName: '',
  dosage: '',
  route: '',
  startDayOffset: 0,
  endDayOffset: 0,
  frequencyPerDay: 1,
};

const emptyForm = {
  name: '',
  description: '',
  drugs: [{ ...emptyDrug }],
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function ProtocolLibrary() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('medical.manage');
  const [protocols, setProtocols] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchProtocols();
      setProtocols(Array.isArray(data) ? data : []);
    } catch (err) {
      setProtocols([]);
      setError(err.message || 'Failed to load protocols.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateDrug(index, field, value) {
    setForm((prev) => ({
      ...prev,
      drugs: prev.drugs.map((drug, drugIndex) => (
        drugIndex === index ? { ...drug, [field]: value } : drug
      )),
    }));
  }

  function addDrugRow() {
    setForm((prev) => ({
      ...prev,
      drugs: [...prev.drugs, { ...emptyDrug }],
    }));
  }

  function removeDrugRow(index) {
    setForm((prev) => ({
      ...prev,
      drugs: prev.drugs.filter((_, drugIndex) => drugIndex !== index),
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError('');
    try {
      await createProtocol({
        name: form.name,
        description: form.description,
        drugs: form.drugs.map((drug) => ({
          drugName: drug.drugName,
          dosage: drug.dosage,
          route: drug.route,
          startDayOffset: Number.parseInt(drug.startDayOffset, 10),
          endDayOffset: Number.parseInt(drug.endDayOffset, 10),
          frequencyPerDay: Number.parseInt(drug.frequencyPerDay, 10),
        })),
      });
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to create protocol.');
    } finally {
      setSaving(false);
    }
  }

  const protocolCountLabel = useMemo(() => {
    if (loading) return 'Loading protocols...';
    return `${protocols.length} protocol${protocols.length === 1 ? '' : 's'}`;
  }, [loading, protocols.length]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Protocol Library</h2>
          <p className="mt-1 text-sm text-slate-600">{protocolCountLabel}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Hide Form' : 'Create Protocol'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!canManage && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have view-only access. Ask an administrator for medical manage permission to create protocols.
        </div>
      )}

      {showForm && canManage && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">New Protocol</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold uppercase text-gray-500">Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Drug Lines</h4>
              <button
                type="button"
                onClick={addDrugRow}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Drug
              </button>
            </div>

            {form.drugs.map((drug, index) => (
              <div key={`drug-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Drug {index + 1}</p>
                  {form.drugs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDrugRow(index)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="text-xs font-semibold uppercase text-gray-500">Drug Name</span>
                    <input
                      value={drug.drugName}
                      onChange={(e) => updateDrug(index, 'drugName', e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Dosage</span>
                    <input
                      value={drug.dosage}
                      onChange={(e) => updateDrug(index, 'dosage', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Route</span>
                    <input
                      value={drug.route}
                      onChange={(e) => updateDrug(index, 'route', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Start Day Offset</span>
                    <input
                      type="number"
                      min="0"
                      value={drug.startDayOffset}
                      onChange={(e) => updateDrug(index, 'startDayOffset', e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">End Day Offset</span>
                    <input
                      type="number"
                      min="0"
                      value={drug.endDayOffset}
                      onChange={(e) => updateDrug(index, 'endDayOffset', e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Frequency Per Day</span>
                    <input
                      type="number"
                      min="1"
                      value={drug.frequencyPerDay}
                      onChange={(e) => updateDrug(index, 'frequencyPerDay', e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Protocol'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Drugs</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Activations</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Loading protocols...</td>
              </tr>
            ) : protocols.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No protocols yet.</td>
              </tr>
            ) : (
              protocols.map((protocol) => (
                <tr key={protocol.id}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{protocol.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{protocol.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{protocol.drugs?.length || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{protocol._count?.activeProtocols || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(protocol.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProtocolLibrary;
