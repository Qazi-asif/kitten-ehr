import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import StatusBadge from '../components/admin/StatusBadge';
import KittenForm from '../components/KittenForm';
import LitterGroupsPanel from '../components/admin/LitterGroupsPanel';
import KittenPhoto from '../components/KittenPhoto';
import {
  createKitten,
  fetchFosters,
  fetchKittens,
  fetchLitters,
  uploadPrimaryPhoto,
} from '../services/api';
import { formatKittenAgeShort } from '../utils/kittenAge';

const STATUS_OPTIONS = ['All', 'In Foster Care', 'Available for Adoption', 'Adopted', 'Medical Hold', 'Transferred', 'Deceased'];

function KittensPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [kittens, setKittens] = useState([]);
  const [litters, setLitters] = useState([]);
  const [fosters, setFosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState(null);
  const [listTab, setListTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fosterFilter, setFosterFilter] = useState('');
  const [litterFilter, setLitterFilter] = useState('');
  const showAddForm = searchParams.get('add') === '1';

  const loadKittens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setKittens(await fetchKittens());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKittens();
    fetchLitters().then(setLitters).catch(() => {});
    fetchFosters().then(setFosters).catch(() => {});
  }, [loadKittens]);

  function closeAddForm() {
    searchParams.delete('add');
    setSearchParams(searchParams);
  }

  async function handleCreateKitten({ kittenData, photoFile }) {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createKitten(kittenData);
      if (photoFile) {
        try {
          await uploadPrimaryPhoto(created.id, photoFile);
        } catch (uploadErr) {
          await loadKittens();
          setError(`Kitten "${created.name}" was saved, but the photo upload failed: ${uploadErr.message}`);
          return;
        }
      }
      await loadKittens();
      setFormKey((k) => k + 1);
      closeAddForm();
    } catch (err) {
      setError(err.message || 'Failed to create kitten');
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    let list = [...kittens];
    if (listTab === 'recent') list = list.slice(0, 5);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((k) => k.name.toLowerCase().includes(q) || k.breed?.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') list = list.filter((k) => k.status === statusFilter);
    if (fosterFilter) list = list.filter((k) => String(k.currentFoster?.id) === fosterFilter);
    if (litterFilter) list = list.filter((k) => String(k.litter?.id) === litterFilter);
    return list;
  }, [kittens, listTab, search, statusFilter, fosterFilter, litterFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { id: 'all', label: 'All Kittens' },
            { id: 'recent', label: 'Recently Viewed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setListTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                listTab === tab.id ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSearchParams({ add: '1' })}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Add Kitten
        </button>
      </div>

      {showAddForm && (
        <div className="relative">
          <button
            type="button"
            onClick={closeAddForm}
            className="absolute right-4 top-4 z-10 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <KittenForm
            key={formKey}
            onSubmit={handleCreateKitten}
            litters={litters}
            onLittersChange={setLitters}
            fosters={fosters}
            submitting={submitting}
          />
        </div>
      )}

      <LitterGroupsPanel
        litters={litters}
        kittens={kittens}
        litterFilter={litterFilter}
        onLittersChange={setLitters}
        onFilterChange={setLitterFilter}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search kittens..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'Status' : s}</option>
            ))}
          </select>
          <select value={fosterFilter} onChange={(e) => setFosterFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Foster</option>
            {fosters.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select value={litterFilter} onChange={(e) => setLitterFilter(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Litter group</option>
            {litters.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading kittens...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['Photo', 'Name', 'Litter Group', 'Foster', 'Status', 'Age', 'Weight', 'Medical Alerts', 'Actions'].map((col) => (
                    <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">No kittens match your filters.</td>
                  </tr>
                ) : (
                  filtered.map((kitten) => (
                    <tr key={kitten.id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-5 py-3">
                        <KittenPhoto kitten={kitten} allowFallback className="h-10 w-10 rounded-full" />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link to={`/admin/kittens/${kitten.id}`} className="text-sm font-semibold text-brand hover:underline">
                          {kitten.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {kitten.litter ? (
                          <button
                            type="button"
                            onClick={() => setLitterFilter(String(kitten.litter.id))}
                            className="font-medium text-brand hover:underline"
                          >
                            {kitten.litter.name}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {kitten.currentFoster ? (
                          <Link to={`/admin/fosters/${kitten.currentFoster.id}`} className="hover:text-brand">{kitten.currentFoster.name}</Link>
                        ) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <StatusBadge status={kitten.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">
                        {formatKittenAgeShort(kitten.dateOfBirth)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-600">—</td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm">
                        {kitten.status === 'Medical Hold' ? (
                          <span className="font-medium text-amber-600">Review</span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <Link
                          to={`/admin/kittens/${kitten.id}`}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default KittensPage;
