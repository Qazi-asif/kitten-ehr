import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toPacificDateString, formatPacificDisplay } from '../../utils/pacificDate';

function placementStatus(placement) {
  if (placement.dischargeDate) {
    return placement.dischargeType || placement.kitten?.status || 'Discharged';
  }
  return 'Active';
}

function KittenPlacementTable({ placements = [], onUpdate, canEdit = false }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ intakeDate: '', dischargeDate: '' });
  const [savingId, setSavingId] = useState(null);

  if (placements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        No foster placement history recorded for this kitten yet.
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
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Foster Home</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Placement Start</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Placement End</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
            {canEdit && (
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {placements.map((placement) => {
            const editing = editingId === placement.id;
            return (
              <tr key={placement.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  <Link to={`/admin/fosters/${placement.foster.id}`} className="text-emerald-700 hover:underline">
                    {placement.foster.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {editing ? (
                    <input
                      type="date"
                      value={draft.intakeDate}
                      onChange={(e) => setDraft((d) => ({ ...d, intakeDate: e.target.value }))}
                      className="rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  ) : (
                    formatPacificDisplay(placement.intakeDate) || '—'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {editing ? (
                    <input
                      type="date"
                      value={draft.dischargeDate}
                      onChange={(e) => setDraft((d) => ({ ...d, dischargeDate: e.target.value }))}
                      className="rounded border border-gray-200 px-2 py-1 text-sm"
                    />
                  ) : (
                    formatPacificDisplay(placement.dischargeDate) || '—'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{placementStatus(placement)}</td>
                {canEdit && (
                  <td className="px-4 py-3 text-sm">
                    {editing ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(placement)}
                          disabled={savingId === placement.id}
                          className="font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                        >
                          {savingId === placement.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="font-semibold text-gray-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(placement)}
                        className="font-semibold text-gray-700 hover:underline"
                      >
                        Edit dates
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default KittenPlacementTable;
