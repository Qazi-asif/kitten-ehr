import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toPacificDateString, formatPacificDisplay } from '../../utils/pacificDate';

function placementStatus(placement) {
  if (placement.dischargeDate) {
    return placement.dischargeType || placement.kitten?.status || 'Discharged';
  }
  return placement.kitten?.status || 'Active';
}

function FosterPlacementTable({
  placements = [],
  onDischarge,
  onUpdate,
  dischargingId = null,
  canEdit = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ intakeDate: '', dischargeDate: '' });
  const [savingId, setSavingId] = useState(null);

  if (placements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        No placement history yet. Assign a kitten to start tracking this foster home.
      </div>
    );
  }

  function startEdit(placement) {
    setEditingId(placement.id);
    setDraft({
      intakeDate: toPacificDateString(placement.intakeDate),
      dischargeDate: placement.dischargeDate ? toPacificDateString(placement.dischargeDate) : '',
    });
  }

  async function saveEdit(placement) {
    if (!onUpdate) return;
    setSavingId(placement.id);
    try {
      await onUpdate(placement, {
        intakeDate: draft.intakeDate,
        dischargeDate: draft.dischargeDate || null,
      });
      setEditingId(null);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kitten</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Placement Start</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Placement End</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {placements.map((placement) => {
            const editing = editingId === placement.id;
            return (
              <tr key={placement.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                  <Link to={`/admin/kittens/${placement.kitten.id}`} className="text-brand hover:underline">
                    {placement.kitten.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                  {editing ? (
                    <input
                      type="date"
                      value={draft.intakeDate}
                      onChange={(e) => setDraft((d) => ({ ...d, intakeDate: e.target.value }))}
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  ) : (
                    formatPacificDisplay(placement.intakeDate) || '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                  {editing ? (
                    <input
                      type="date"
                      value={draft.dischargeDate}
                      onChange={(e) => setDraft((d) => ({ ...d, dischargeDate: e.target.value }))}
                      className="rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  ) : (
                    formatPacificDisplay(placement.dischargeDate) || '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{placementStatus(placement)}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(placement)}
                          disabled={savingId === placement.id}
                          className="font-semibold text-brand hover:underline disabled:opacity-50"
                        >
                          {savingId === placement.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="font-semibold text-slate-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {canEdit && onUpdate && (
                          <button
                            type="button"
                            onClick={() => startEdit(placement)}
                            className="font-semibold text-slate-700 hover:underline"
                          >
                            Edit dates
                          </button>
                        )}
                        {!placement.dischargeDate && onDischarge ? (
                          <button
                            type="button"
                            onClick={() => onDischarge(placement)}
                            disabled={dischargingId === placement.id}
                            className="font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            {dischargingId === placement.id ? 'Ending...' : 'End Placement'}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default FosterPlacementTable;
