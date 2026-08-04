import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { downloadKittensCsv, fetchReportsSummary } from '../../services/api';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [startDate, setStartDate] = useState(daysAgoIso(30));
  const [endDate, setEndDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReportsSummary({ startDate, endDate });
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await downloadKittensCsv();
    } catch (err) {
      setError(err.message || 'Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Audit-oriented summary counts and exportable data. Full analytics/BI is planned for a future release.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export Kitten List (CSV)'}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Adoptions From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Adoptions To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading reports...</p>}

      {!loading && summary && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Active Cats</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.activeKittens}</p>
              <p className="mt-1 text-xs text-slate-400">{summary.totalKittens} total (all-time)</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-emerald-800">Adoptions in Range</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.adoptionsInRange}</p>
              <p className="mt-1 text-xs text-emerald-700/70">
                {summary.range?.startDate} – {summary.range?.endDate}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-sm font-medium text-slate-300">Active Foster Placements</p>
              <p className="mt-2 text-3xl font-bold">{summary.activePlacements}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">Cats by Status</h2>
              </div>
              <table className="min-w-full divide-y divide-slate-100">
                <tbody className="divide-y divide-slate-100 text-sm">
                  {summary.kittensByStatus.map((row) => (
                    <tr key={row.status}>
                      <td className="px-4 py-2 text-slate-700">{row.status}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-bold text-slate-900">Applications by Status</h2>
              </div>
              <table className="min-w-full divide-y divide-slate-100">
                <tbody className="divide-y divide-slate-100 text-sm">
                  {summary.applicationsByStatus.length === 0 && (
                    <tr>
                      <td className="px-4 py-3 text-slate-400">No applications yet.</td>
                    </tr>
                  )}
                  {summary.applicationsByStatus.map((row) => (
                    <tr key={row.status}>
                      <td className="px-4 py-2 text-slate-700">{row.status}</td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-900">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ReportsPage;
