import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchAllReminders } from '../../services/dashboardApi';
import { formatPacificDisplay } from '../../utils/pacificDate';
import { formatKittenAgeShort } from '../../utils/kittenAge';

const TONE_STYLES = {
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

function CategorySection({ category, expanded, onToggle }) {
  const tone = TONE_STYLES[category.tone] || TONE_STYLES.slate;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between gap-3 border-b px-5 py-4 text-left ${tone}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{category.label}</span>
            <span className="block truncate text-xs font-medium opacity-80">{category.description}</span>
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold tabular-nums">
          {category.count}
        </span>
      </button>

      {expanded && (
        category.count === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">No cats in this category.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Age</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Fixed</th>
                  <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Intake</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {category.kittens.map((kitten) => (
                  <tr key={kitten.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-sm font-semibold text-slate-900">
                      <Link to={`/admin/kittens/${kitten.id}`} className="text-brand hover:underline">
                        {kitten.name}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-sm text-slate-600">{kitten.status}</td>
                    <td className="px-5 py-2.5 text-sm text-slate-600">{formatKittenAgeShort(kitten.dateOfBirth)}</td>
                    <td className="px-5 py-2.5 text-sm text-slate-600">{kitten.fixedStatus || 'Unknown'}</td>
                    <td className="px-5 py-2.5 text-sm text-slate-500">
                      {kitten.intakeDate ? formatPacificDisplay(kitten.intakeDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-right">
        <Link
          to={`/admin/kittens?reminder=${encodeURIComponent(category.key)}`}
          className="text-xs font-semibold text-brand hover:underline"
        >
          Open in cats list
        </Link>
      </div>
    </section>
  );
}

function RemindersPage() {
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllReminders();
      setCategories(data.categories || []);
      // Open the categories that actually need attention.
      setExpanded(new Set((data.categories || []).filter((c) => c.count > 0).map((c) => c.key)));
    } catch (err) {
      setError(err.message || 'Failed to load reminders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900">All Reminders</h1>
        </div>
        <p className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${total} item${total === 1 ? '' : 's'} across ${categories.length} categories`}
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading reminders…</p>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <CategorySection
              key={category.key}
              category={category}
              expanded={expanded.has(category.key)}
              onToggle={() => toggle(category.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default RemindersPage;
