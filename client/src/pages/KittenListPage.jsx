import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
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
import { KITTEN_STATUS_OPTIONS } from '../constants/kittenStatuses';
import { formatKittenAgeShort } from '../utils/kittenAge';

const DEFAULT_STATUS_FILTERS = ['Available for Adoption', 'In Foster Care', 'Medical Hold'];
const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A–Z)' },
  { value: 'name_desc', label: 'Name (Z–A)' },
  { value: '', label: 'Sort: Recent intake' },
  { value: 'age_desc', label: 'Age (youngest first)' },
  { value: 'age_asc', label: 'Age (oldest first)' },
  { value: 'gender_asc', label: 'Gender (A–Z)' },
  { value: 'gender_desc', label: 'Gender (Z–A)' },
];
const PAGE_SIZE_OPTIONS = [25, 50, 100];

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
  const [selectedStatuses, setSelectedStatuses] = useState(() => [...DEFAULT_STATUS_FILTERS]);
  const [fosterFilter, setFosterFilter] = useState('');
  const [litterFilter, setLitterFilter] = useState('');
  const [sort, setSort] = useState('name_asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const showAddForm = searchParams.get('add') === '1';

  const loadKittens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (listTab !== 'recent' && selectedStatuses.length === 0) {
        setKittens([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      const data = await fetchKittens({
        page: listTab === 'recent' ? 1 : page,
        limit: listTab === 'recent' ? 5 : pageSize,
        search: search.trim() || undefined,
        statuses: listTab === 'recent' ? undefined : selectedStatuses,
        fosterId: fosterFilter || undefined,
        litterId: litterFilter || undefined,
        sort: listTab === 'recent' ? undefined : (sort || undefined),
      });
      setKittens(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(err.message);
      setKittens([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, listTab, search, selectedStatuses, fosterFilter, litterFilter, sort]);

  useEffect(() => {
    loadKittens();
  }, [loadKittens]);

  // Litters and fosters are only needed for filters/form — load them once on mount
  useEffect(() => {
    Promise.all([
      fetchLitters({ status: 'active', sort: 'name' }).then(setLitters).catch(() => {}),
      fetchFosters().then(setFosters).catch(() => {}),
    ]).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, selectedStatuses, fosterFilter, litterFilter, listTab, sort, pageSize]);

  function closeAddForm() {
    searchParams.delete('add');
    setSearchParams(searchParams);
  }

  function toggleStatus(status) {
    setSelectedStatuses((prev) => (
      prev.includes(status)
        ? prev.filter((value) => value !== status)
        : [...prev, status]
    ));
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

  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { id: 'all', label: 'All Cats' },
            { id: 'recent', label: 'Recent Intakes' },
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
          Add Cat
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

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cats..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </label>
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
          <select
            value={listTab === 'recent' ? '' : sort}
            onChange={(e) => setSort(e.target.value)}
            disabled={listTab === 'recent'}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            aria-label="Sort cats"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value || 'default'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status filters</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {KITTEN_STATUS_OPTIONS.map((status) => (
              <label key={status} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                  disabled={listTab === 'recent'}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                {status}
              </label>
            ))}
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading cats...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span>
              {total} cat{total === 1 ? '' : 's'}
              {listTab === 'all' ? ` · Page ${page} of ${totalPages}` : ' · Recent intakes'}
            </span>
            {listTab === 'all' && (
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <span>Page size</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
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
                {kittens.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">No cats match your filters.</td>
                  </tr>
                ) : (
                  kittens.map((kitten) => (
                    <tr key={kitten.id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-5 py-3">
                        <KittenPhoto
                          kitten={kitten.primaryPhotoUrl ? kitten : { ...kitten, primaryPhotoUrl: kitten.thumbnailUrl }}
                          className="h-10 w-10 rounded-full"
                        />
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

          {listTab === 'all' && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`min-w-9 rounded-lg px-3 py-1.5 text-sm font-semibold ${
                      pageNumber === page
                        ? 'bg-brand text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KittensPage;
