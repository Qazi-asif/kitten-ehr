import { useCallback, useEffect, useMemo, useState } from 'react';
import MedicationForm from '../MedicationForm';
import MedicationsTable from '../MedicationsTable';
import VaccineForm from '../VaccineForm';
import VaccinesTable from '../VaccinesTable';
import VetVisitForm from '../VetVisitForm';
import VetVisitsTable from '../VetVisitsTable';
import WeightLogForm from '../WeightLogForm';
import WeightLogsTable from '../WeightLogsTable';
import {
  activateKittenProtocol,
  deleteKittenActiveProtocol,
  fetchKittenActiveProtocols,
  fetchKittenProtocolDoses,
  fetchProtocols,
  markProtocolDoseGiven,
  updateKittenActiveProtocol,
} from '../../services/protocolApi';
import { pacificToday, toPacificDateString } from '../../utils/pacificDate';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatDoseDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function KittenHealthTab({
  kittenId,
  canManageMedical,
  medical,
  weightLogs,
  onCreateVaccine,
  onUpdateVaccine,
  onDeleteVaccine,
  onCreateMedication,
  onUpdateMedication,
  onDeleteMedication,
  onCreateVetVisit,
  onUpdateVetVisit,
  onDeleteVetVisit,
  onCreateWeight,
  onUpdateWeight,
  onDeleteWeight,
}) {
  const [protocolLibrary, setProtocolLibrary] = useState([]);
  const [activeProtocols, setActiveProtocols] = useState([]);
  const [doses, setDoses] = useState([]);
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [activationDate, setActivationDate] = useState(() => pacificToday());
  const [givenDate, setGivenDate] = useState(() => pacificToday());
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [markingDoseId, setMarkingDoseId] = useState(null);
  const [error, setError] = useState('');
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [editingMedication, setEditingMedication] = useState(null);
  const [editingVetVisit, setEditingVetVisit] = useState(null);
  const [editingWeight, setEditingWeight] = useState(null);

  const loadProtocolData = useCallback(async () => {
    if (!kittenId) return;
    setLoading(true);
    setError('');
    try {
      const [library, active, doseRows] = await Promise.all([
        fetchProtocols(),
        fetchKittenActiveProtocols(kittenId),
        fetchKittenProtocolDoses(kittenId),
      ]);
      setProtocolLibrary(Array.isArray(library) ? library : []);
      setActiveProtocols(Array.isArray(active) ? active : []);
      setDoses(Array.isArray(doseRows) ? doseRows : []);
      setSelectedProtocolId((prev) => prev || String(library?.[0]?.id || ''));
    } catch (err) {
      setError(err.message || 'Failed to load protocol data.');
    } finally {
      setLoading(false);
    }
  }, [kittenId]);

  useEffect(() => {
    loadProtocolData();
  }, [loadProtocolData]);

  const dosesByDate = useMemo(() => {
    const grouped = new Map();
    doses.forEach((dose) => {
      const key = dose.scheduledDate?.slice(0, 10) || 'unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(dose);
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [doses]);

  const currentProtocols = useMemo(
    () => activeProtocols.filter((entry) => entry.status === 'ACTIVE'),
    [activeProtocols],
  );

  const protocolHistory = useMemo(
    () => activeProtocols.filter((entry) => entry.status !== 'ACTIVE'),
    [activeProtocols],
  );

  async function handleActivateProtocol(event) {
    event.preventDefault();
    if (!canManageMedical || !selectedProtocolId) return;

    setActivating(true);
    setError('');
    try {
      await activateKittenProtocol(kittenId, {
        protocolId: Number.parseInt(selectedProtocolId, 10),
        activationDate,
      });
      await loadProtocolData();
    } catch (err) {
      setError(err.message || 'Failed to activate protocol.');
    } finally {
      setActivating(false);
    }
  }

  async function handleDiscontinueProtocol(entry) {
    if (!canManageMedical) return;
    if (!window.confirm(`Discontinue "${entry.protocol?.name}"? Scheduled doses will remain in history.`)) return;
    setError('');
    try {
      await updateKittenActiveProtocol(kittenId, entry.id, { status: 'DISCONTINUED' });
      await loadProtocolData();
    } catch (err) {
      setError(err.message || 'Failed to discontinue protocol.');
    }
  }

  async function handleDeleteProtocol(entry) {
    if (!canManageMedical) return;
    if (!window.confirm(`Permanently delete "${entry.protocol?.name}" and all its doses?`)) return;
    setError('');
    try {
      await deleteKittenActiveProtocol(kittenId, entry.id);
      await loadProtocolData();
    } catch (err) {
      setError(err.message || 'Failed to delete protocol.');
    }
  }

  async function handleUpdateActivationDate(entry, nextDate) {
    if (!canManageMedical || !nextDate) return;
    setError('');
    try {
      await updateKittenActiveProtocol(kittenId, entry.id, { activationDate: nextDate });
      await loadProtocolData();
    } catch (err) {
      setError(err.message || 'Failed to update activation date.');
    }
  }

  async function handleMarkDoseGiven(doseId) {
    if (!canManageMedical) return;

    setMarkingDoseId(doseId);
    setError('');
    try {
      await markProtocolDoseGiven(kittenId, doseId, { givenDate });
      await loadProtocolData();
    } catch (err) {
      setError(err.message || 'Failed to mark dose as given.');
    } finally {
      setMarkingDoseId(null);
    }
  }

  async function handleVaccineSubmit(formData, existing) {
    if (existing?.id) {
      await onUpdateVaccine?.(existing.id, formData);
      setEditingVaccine(null);
      return;
    }
    await onCreateVaccine?.(formData);
  }

  async function handleMedicationSubmit(formData, existing) {
    if (existing?.id) {
      await onUpdateMedication?.(existing.id, formData);
      setEditingMedication(null);
      return;
    }
    await onCreateMedication?.(formData);
  }

  async function handleVetVisitSubmit(formData, existing) {
    if (existing?.id) {
      await onUpdateVetVisit?.(existing.id, formData);
      setEditingVetVisit(null);
      return;
    }
    await onCreateVetVisit?.(formData);
  }

  async function handleWeightSubmit(formData, existing) {
    if (existing?.id) {
      await onUpdateWeight?.(existing.id, formData);
      setEditingWeight(null);
      return;
    }
    await onCreateWeight?.(formData);
  }

  async function handleDeleteVaccine(record) {
    if (!window.confirm('Delete this vaccination permanently?')) return;
    await onDeleteVaccine?.(record.id);
    if (editingVaccine?.id === record.id) setEditingVaccine(null);
  }

  async function handleDeleteMedication(record) {
    if (!window.confirm('Delete this medication permanently?')) return;
    await onDeleteMedication?.(record.id);
    if (editingMedication?.id === record.id) setEditingMedication(null);
  }

  async function handleDeleteVetVisit(record) {
    if (!window.confirm('Delete this vet visit permanently?')) return;
    await onDeleteVetVisit?.(record.id);
    if (editingVetVisit?.id === record.id) setEditingVetVisit(null);
  }

  async function handleDeleteWeight(record) {
    if (!window.confirm('Delete this weight log permanently?')) return;
    await onDeleteWeight?.(record.id);
    if (editingWeight?.id === record.id) setEditingWeight(null);
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-900">Active Protocols</h3>
        <p className="mt-1 text-sm text-emerald-800">
          Activate a library protocol to generate this kitten&apos;s daily medication schedule.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading protocols...</p>
        ) : (
          <>
            {!error && currentProtocols.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">No active protocols for this kitten yet.</p>
            ) : !error ? (
              <div className="mt-4 space-y-3">
                {currentProtocols.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{entry.protocol?.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Activated {formatDate(entry.activationDate)} by {entry.activatedBy?.firstName} {entry.activatedBy?.lastName}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">{entry._count?.doses || 0} scheduled doses</p>
                    {canManageMedical && (
                      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
                        <label className="w-40">
                          <span className="text-[10px] font-semibold uppercase text-gray-500">Activation date</span>
                          <input
                            type="date"
                            defaultValue={toPacificDateString(entry.activationDate)}
                            onBlur={(e) => {
                              const next = e.target.value;
                              if (next && next !== toPacificDateString(entry.activationDate)) {
                                handleUpdateActivationDate(entry, next);
                              }
                            }}
                            className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDiscontinueProtocol(entry)}
                          className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                        >
                          Discontinue
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProtocol(entry)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {canManageMedical && (
              <form onSubmit={handleActivateProtocol} className="mt-5 flex flex-col gap-3 rounded-lg border border-emerald-100 bg-white p-4 md:flex-row md:items-end">
                <label className="min-w-0 flex-1">
                  <span className="text-xs font-semibold uppercase text-gray-500">Protocol</span>
                  <select
                    value={selectedProtocolId}
                    onChange={(e) => setSelectedProtocolId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select protocol</option>
                    {protocolLibrary.map((protocol) => (
                      <option key={protocol.id} value={protocol.id}>
                        {protocol.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="w-full md:w-48">
                  <span className="text-xs font-semibold uppercase text-gray-500">Activation Date</span>
                  <input
                    type="date"
                    value={activationDate}
                    onChange={(e) => setActivationDate(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  disabled={activating || !selectedProtocolId}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {activating ? 'Activating...' : 'Activate Protocol'}
                </button>
              </form>
            )}
          </>
        )}
      </section>

      {protocolHistory.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Protocol History</h3>
          <p className="mt-1 text-sm text-gray-500">
            Completed or discontinued protocols for this kitten.
          </p>
          <div className="mt-4 space-y-3">
            {protocolHistory.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{entry.protocol?.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Activated {formatDate(entry.activationDate)} by {entry.activatedBy?.firstName} {entry.activatedBy?.lastName}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    {entry.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">{entry._count?.doses || 0} scheduled doses</p>
                {canManageMedical && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteProtocol(entry)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Delete permanently
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-xs font-bold uppercase text-gray-700">Dose Checklist</h3>
          {canManageMedical && (
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <span className="text-xs font-semibold uppercase text-gray-500">Mark-given date</span>
              <input
                type="date"
                value={givenDate}
                onChange={(e) => setGivenDate(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              />
            </label>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading dose checklist...</p>
        ) : !error && doses.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
            No protocol doses scheduled yet. Activate a protocol to generate the daily checklist.
          </p>
        ) : !error ? (
          <div className="space-y-5">
            {dosesByDate.map(([dateKey, dateDoses]) => (
              <div key={dateKey} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <h4 className="text-sm font-bold text-gray-900">{formatDoseDate(dateDoses[0]?.scheduledDate)}</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {dateDoses.map((dose) => (
                    <div key={dose.id} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{dose.protocolDrug?.drugName}</p>
                        <p className="text-xs text-gray-500">{dose.activeProtocol?.protocol?.name}</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        {dose.protocolDrug?.dosage || '—'} · {dose.protocolDrug?.route || '—'}
                      </p>
                      <p className="text-sm text-gray-600">Dose {dose.doseNumberInDay}</p>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          dose.status === 'GIVEN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : dose.status === 'MISSED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                        >
                          {dose.status}
                        </span>
                        {canManageMedical && dose.status !== 'GIVEN' && (
                          <button
                            type="button"
                            onClick={() => handleMarkDoseGiven(dose.id)}
                            disabled={markingDoseId === dose.id}
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            {markingDoseId === dose.id ? 'Saving...' : 'Mark Given'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase text-gray-700">Weight</h3>
        {canManageMedical && (
          <WeightLogForm
            initialValues={editingWeight}
            onSubmit={handleWeightSubmit}
            onCancel={() => setEditingWeight(null)}
          />
        )}
        <WeightLogsTable
          logs={weightLogs}
          canManage={canManageMedical}
          onEdit={setEditingWeight}
          onDelete={handleDeleteWeight}
        />
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase text-gray-700">Vaccinations</h3>
        {canManageMedical && (
          <VaccineForm
            initialValues={editingVaccine}
            onSubmit={handleVaccineSubmit}
            onCancel={() => setEditingVaccine(null)}
          />
        )}
        <VaccinesTable
          vaccines={medical.vaccines}
          canManage={canManageMedical}
          onEdit={setEditingVaccine}
          onDelete={handleDeleteVaccine}
        />
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase text-gray-700">Medications</h3>
        {canManageMedical && (
          <MedicationForm
            initialValues={editingMedication}
            onSubmit={handleMedicationSubmit}
            onCancel={() => setEditingMedication(null)}
          />
        )}
        <MedicationsTable
          medications={medical.medications}
          canManage={canManageMedical}
          onEdit={setEditingMedication}
          onDelete={handleDeleteMedication}
        />
      </section>

      <section>
        <h3 className="mb-3 text-xs font-bold uppercase text-gray-700">Vet Visits</h3>
        {canManageMedical && (
          <VetVisitForm
            initialValues={editingVetVisit}
            onSubmit={handleVetVisitSubmit}
            onCancel={() => setEditingVetVisit(null)}
          />
        )}
        <VetVisitsTable
          vetAppointments={medical.vetAppointments}
          canManage={canManageMedical}
          onEdit={setEditingVetVisit}
          onDelete={handleDeleteVetVisit}
        />
      </section>
    </div>
  );
}

export default KittenHealthTab;
