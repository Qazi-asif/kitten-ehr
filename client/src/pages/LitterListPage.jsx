import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import CreateLitterModal from '../components/admin/CreateLitterModal';
import {
  activateLitter,
  deactivateLitter,
  deleteLitter,
  fetchLitters,
} from '../services/api';
import { formatPacificDisplay } from '../utils/pacificDate';

function formatDate(value) {
  return formatPacificDisplay(value) || '—';
}

function LitterListPage() {
  const [litters, setLitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('name');

  const loadLitters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLitters({ status: statusFilter, sort });
      setLitters(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sort]);

  useEffect(() => {
    loadLitters();
  }, [loadLitters]);

  function handleCreated(created) {
    if (statusFilter === 'inactive') {
      setStatusFilter('all');
    } else {
      setLitters((prev) => {
        const next = [...prev, created];
        if (sort === 'name') {
          return next.sort((a, b) => a.name.localeCompare(b.name));
        }
        return next;
      });
    }
    setShowCreateModal(false);
  }

  async function handleDeactivateLitter(litter) {
    const confirmed = window.confirm(
      `Deactivate ${litter.name}? It will be marked inactive and hidden from new kitten assignment, but not deleted.`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      await deactivateLitter(litter.id);
      await loadLitters();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleActivateLitter(litter) {
    const confirmed = window.confirm(
      `Re-activate ${litter.name}? It will appear in active litter lists again.`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      await activateLitter(litter.id);
      await loadLitters();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteLitter(litter) {
    const confirmed = window.confirm(
      `Permanently delete ${litter.name}? This cannot be undone. Linked kittens will remain but lose their litter group assignment.`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      await deleteLitter(litter.id);
      await loadLitters();
    } catch (err) {
      setError(err.message);
    }
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

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          aria-label="Filter litters by status"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          aria-label="Sort litters"
        >
          <option value="name">Name</option>
          <option value="recent">Most recent</option>
        </select>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading litters...</p>}
      {!loading && error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && litters.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No litter groups match this filter. Click &quot;New Litter Group&quot; to create one.
        </p>
      )}

      {!loading && !error && litters.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Intake Date</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Kittens</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {litters.map((litter) => {
                const isActive = litter.isActive !== false;
                return (
                  <tr key={litter.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-900">
                      <Link to={`/admin/litters/${litter.id}`} className="text-brand hover:underline">
                        {litter.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{formatDate(litter.intakeDate)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{litter._count?.kittens ?? 0}</td>
                    <td className="min-w-[6.5rem] px-4 py-3 text-sm">
                      <div className="flex flex-col items-start gap-1.5">
                        <Link
                          to={`/admin/litters/${litter.id}`}
                          className="inline-flex max-w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeactivateLitter(litter)}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Deactivate
                          </button>
                        )}
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivateLitter(litter)}
                            className="text-xs font-medium text-emerald-700 hover:underline"
                          >
                            Re-activate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteLitter(litter)}
                          className="text-xs font-medium text-red-700 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
