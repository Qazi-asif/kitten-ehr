import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import {
  fetchOnboardingById,
  fetchOnboardingList,
  updateOnboardingChecklistItem,
} from '../../services/api';

const STATUS_STYLES = {
  APPLIED: 'bg-blue-100 text-blue-800',
  SCREENING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  ACTIVE: 'bg-emerald-100 text-emerald-900',
  DECLINED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-slate-100 text-slate-600',
};

function OnboardingPage() {
  const [records, setRecords] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);
  const [error, setError] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRecords(await fetchOnboardingList());
    } catch (err) {
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function openRecord(id) {
    setSelectedId(id);
    setDetailLoading(true);
    setError('');
    try {
      setSelected(await fetchOnboardingById(id));
    } catch (err) {
      setError(err.message);
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleChecklistItem(item) {
    if (!selected) return;
    setSavingItemId(item.id);
    try {
      const updated = await updateOnboardingChecklistItem(selected.id, item.id, {
        isComplete: !item.isComplete,
      });
      setSelected((prev) => ({
        ...prev,
        checklistItems: prev.checklistItems.map((row) => (row.id === item.id ? { ...row, ...updated } : row)),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingItemId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Foster Onboarding</h1>
      <p className="mb-6 text-sm text-gray-500">Track prospective fosters through the intake checklist.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Prospective Fosters</h2>
          </div>
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Loading...</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                      No onboarding records yet.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className={selectedId === record.id ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{record.applicantName}</p>
                        <p className="text-xs text-gray-500">{record.applicantEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[record.status] || STATUS_STYLES.APPLIED}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => openRecord(record.id)}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          View checklist
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {!selectedId ? (
            <p className="text-sm text-gray-500">Select a prospective foster to view their onboarding checklist.</p>
          ) : detailLoading ? (
            <p className="text-sm text-gray-500">Loading checklist...</p>
          ) : selected ? (
            <>
              <div className="border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-900">{selected.applicantName}</h2>
                <p className="text-sm text-gray-500">{selected.applicantEmail}</p>
              </div>
              <ul className="mt-4 space-y-3">
                {selected.checklistItems?.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 rounded-lg border border-gray-100 px-4 py-3">
                    <button
                      type="button"
                      disabled={savingItemId === item.id}
                      onClick={() => toggleChecklistItem(item)}
                      className="mt-0.5 shrink-0 text-emerald-700 disabled:opacity-50"
                      aria-label={item.isComplete ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {item.isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <div>
                      <p className={`text-sm font-medium ${item.isComplete ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {item.label}
                      </p>
                      {item.completedAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          Completed {new Date(item.completedAt).toLocaleString()}
                          {item.completedByUser
                            ? ` by ${item.completedByUser.firstName} ${item.completedByUser.lastName}`
                            : ''}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-500">Could not load checklist.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;
