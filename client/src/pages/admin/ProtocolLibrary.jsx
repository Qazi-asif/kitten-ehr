import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  createProtocol,
  deactivateProtocol,
  fetchProtocols,
  updateProtocol,
} from '../../services/protocolApi';
import { formatPacificDisplay } from '../../utils/pacificDate';

const CADENCE_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'EVERY_N_DAYS', label: 'Every N Days' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const RECORD_TYPE_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'VACCINE', label: 'Vaccine' },
];

const HEALTH_WRITE_MODE_OPTIONS = [
  { value: 'PER_DOSE', label: 'Per Dose' },
  { value: 'COURSE', label: 'Course (single record)' },
];

const emptyDrug = {
  drugName: '',
  dosage: '',
  route: '',
  startDayOffset: 0,
  endDayOffset: 0,
  frequencyPerDay: 1,
  cadence: 'DAILY',
  intervalDays: 1,
  recordType: 'NONE',
  healthWriteMode: 'PER_DOSE',
};

const emptyForm = {
  name: '',
  description: '',
  drugs: [{ ...emptyDrug }],
};

function formatDate(value) {
  return formatPacificDisplay(value) || '—';
}

function ProtocolLibrary() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('medical.manage');
  const formRef = useRef(null);
  const [protocols, setProtocols] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  function updateDrug(index, field, value) {
    setForm((prev) => ({
      ...prev,
      drugs: prev.drugs.map((drug, drugIndex) => {
        if (drugIndex !== index) return drug;
        const updated = { ...drug, [field]: value };
        // Vaccines have no "course" concept - always recorded per dose.
        // NONE has no write mode to speak of either.
        if (field === 'recordType' && value !== 'MEDICATION') {
          updated.healthWriteMode = 'PER_DOSE';
        }
        return updated;
      }),
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
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        description: form.description,
        drugs: form.drugs.map((drug) => ({
          id: drug.id,
          drugName: drug.drugName,
          dosage: drug.dosage,
          route: drug.route,
          startDayOffset: Number.parseInt(drug.startDayOffset, 10),
          endDayOffset: Number.parseInt(drug.endDayOffset, 10),
          frequencyPerDay: Number.parseInt(drug.frequencyPerDay, 10),
          cadence: drug.cadence,
          intervalDays: Number.parseInt(drug.intervalDays, 10),
          recordType: drug.recordType,
          healthWriteMode: drug.healthWriteMode,
        })),
      };

      if (editingId) {
        await updateProtocol(editingId, payload);
      } else {
        await createProtocol(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save protocol.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(protocol) {
    if (!canManage) return;
    setEditingId(protocol.id);
    setForm({
      name: protocol.name ?? '',
      description: protocol.description ?? '',
      drugs: (protocol.drugs || []).length > 0
        ? protocol.drugs.map((drug) => ({
            id: drug.id,
            drugName: drug.drugName ?? '',
            dosage: drug.dosage ?? '',
            route: drug.route ?? '',
            startDayOffset: drug.startDayOffset ?? 0,
            endDayOffset: drug.endDayOffset ?? 0,
            frequencyPerDay: drug.frequencyPerDay ?? 1,
            cadence: drug.cadence ?? 'DAILY',
            intervalDays: drug.intervalDays ?? 1,
            recordType: drug.recordType ?? 'NONE',
            healthWriteMode: drug.healthWriteMode ?? 'PER_DOSE',
          }))
        : [{ ...emptyDrug }],
    });
    setShowForm(true);
    setError('');
  }

  async function handleDeactivate(id) {
    if (!canManage) return;
    if (!window.confirm('Deactivate this protocol? It will be hidden from the active library.')) return;

    setDeletingId(id);
    setError('');
    try {
      await deactivateProtocol(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Failed to deactivate protocol.');
    } finally {
      setDeletingId(null);
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
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
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
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className={`mb-8 rounded-xl border bg-white p-6 shadow-sm ${
            editingId ? 'border-brand ring-2 ring-brand/20' : 'border-gray-200'
          }`}
        >
          <h3 className="text-lg font-semibold text-slate-900">
            {editingId ? `Edit Protocol: ${form.name || 'Untitled'}` : 'New Protocol'}
          </h3>
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
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Cadence</span>
                    <select
                      value={drug.cadence}
                      onChange={(e) => updateDrug(index, 'cadence', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      {CADENCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  {drug.cadence === 'EVERY_N_DAYS' && (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-gray-500">Interval (Days)</span>
                      <input
                        type="number"
                        min="1"
                        value={drug.intervalDays}
                        onChange={(e) => updateDrug(index, 'intervalDays', e.target.value)}
                        required
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  )}
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500">Health Record Type</span>
                    <select
                      value={drug.recordType}
                      onChange={(e) => updateDrug(index, 'recordType', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      {RECORD_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  {drug.recordType === 'MEDICATION' && (
                    <label className="block">
                      <span className="text-xs font-semibold uppercase text-gray-500">Health Write Mode</span>
                      <select
                        value={drug.healthWriteMode}
                        onChange={(e) => updateDrug(index, 'healthWriteMode', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        {HEALTH_WRITE_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {drug.recordType === 'VACCINE' && (
                    <p className="block text-xs text-gray-500 md:col-span-2">
                      Vaccines are always recorded per dose.
                    </p>
                  )}
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
              {saving ? 'Saving...' : editingId ? 'Update Protocol' : 'Save Protocol'}
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">Loading protocols...</td>
              </tr>
            ) : protocols.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No protocols yet.</td>
              </tr>
            ) : (
              protocols.map((protocol) => (
                <tr key={protocol.id} className={editingId === protocol.id ? 'bg-brand-light/40' : undefined}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{protocol.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{protocol.description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{protocol.drugs?.length || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{protocol._count?.activeProtocols || 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(protocol.updatedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(protocol)}
                          disabled={saving || deletingId === protocol.id}
                          className="mr-3 font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(protocol.id)}
                          disabled={saving || deletingId === protocol.id}
                          className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === protocol.id ? 'Deactivating...' : 'Deactivate'}
                        </button>
                      </>
                    )}
                  </td>
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
