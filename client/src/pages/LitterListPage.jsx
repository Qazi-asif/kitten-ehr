import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import CreateLitterModal from '../components/admin/CreateLitterModal';
import { activateLitter, deactivateLitter, fetchLitters } from '../services/api';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function LitterListPage() {
  const [litters, setLitters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active');
  const [sort, setSort] = useState('name');
  const [togglingId, setTogglingId] = useState(null);

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
      setStatusFilter('active');
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

  async function handleToggleActive(litter) {
    setTogglingId(litter.id);
    setError(null);
    try {
      const updated = litter.isActive === false
        ? await activateLitter(litter.id)
        : await deactivateLitter(litter.id);
      setLitters((prev) => {
        if (statusFilter === 'all') {
          return prev.map((item) => (item.id === updated.id ? updated : item));
        }
        return prev.filter((item) => item.id !== updated.id);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
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
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                      {isActive ? 'Active' : 'Inactive'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{formatDate(litter.intakeDate)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">{litter._count?.kittens ?? 0}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/litters/${litter.id}`}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(litter)}
                          disabled={togglingId === litter.id}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {togglingId === litter.id
                            ? 'Saving...'
                            : isActive
                              ? 'Deactivate'
                              : 'Activate'}
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
