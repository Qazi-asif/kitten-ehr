import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import CreateLitterModal from '../components/admin/CreateLitterModal';
import { fetchLitters } from '../services/api';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function LitterListPage() {
  const [litters, setLitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadLitters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLitters();
      setLitters(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLitters();
  }, [loadLitters]);

  function handleCreated(created) {
    setLitters((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCreateModal(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Litters</h1>
          <p className="mt-1 text-sm text-slate-500">Manage intake groups for kittens rescued together.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          New Litter Group
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading litters...</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && litters.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No litter groups yet. Click &quot;New Litter Group&quot; to create your first intake group.
        </p>
      )}

      {!loading && !error && litters.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Intake Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kittens</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {litters.map((litter) => (
                <tr key={litter.id} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-900">
                    <Link to={`/admin/litters/${litter.id}`} className="text-brand hover:underline">
                      {litter.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{formatDate(litter.intakeDate)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{litter._count?.kittens ?? 0}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm">
                    <Link
                      to={`/admin/litters/${litter.id}`}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateLitterModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

export default LitterListPage;
