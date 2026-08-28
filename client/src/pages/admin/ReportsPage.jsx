import { useCallback, useEffect, useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import {
  downloadReportCsv,
  fetchReportsCatalog,
  runReport,
} from '../../services/api';
import { pacificToday } from '../../utils/pacificDate';

/** Quick ranges staff actually ask for: this month for audits, this year for the board. */
function presetRanges() {
  const today = pacificToday();
  const [year, month] = today.split('-');
  return [
    { key: 'thisMonth', label: 'This month', startDate: `${year}-${month}-01`, endDate: today },
    { key: 'thisYear', label: 'This year', startDate: `${year}-01-01`, endDate: today },
    { key: 'lastYear', label: 'Last year', startDate: `${Number(year) - 1}-01-01`, endDate: `${Number(year) - 1}-12-31` },
    { key: 'allTime', label: 'All time', startDate: '2000-01-01', endDate: today },
  ];
}

function SummaryCard({ item }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" title={item.hint || ''}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{item.value}</p>
      {item.hint && <p className="mt-1 text-xs leading-snug text-slate-400">{item.hint}</p>}
    </div>
  );
}

function ReportsPage() {
  const [catalog, setCatalog] = useState([]);
  const [selectedKey, setSelectedKey] = useState('intake-outcome-summary');
  const [report, setReport] = useState(null);
  const ranges = presetRanges();
  const [startDate, setStartDate] = useState(ranges[1].startDate);
  const [endDate, setEndDate] = useState(ranges[1].endDate);
  const [vaccineType, setVaccineType] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReportsCatalog()
      .then((data) => setCatalog(data.reports || []))
      .catch((err) => setError(err.message || 'Failed to load report catalog.'));
  }, []);

  const selected = catalog.find((item) => item.key === selectedKey);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await runReport(selectedKey, { startDate, endDate, vaccineType });
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to run report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [selectedKey, startDate, endDate, vaccineType]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    setExporting(true);
    setError('');
    try {
      await downloadReportCsv(selectedKey, { startDate, endDate, vaccineType });
    } catch (err) {
      setError(err.message || 'Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  }

  function applyPreset(preset) {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Each report answers one question, with summary counts on top and the underlying rows beneath.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || !report}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting…' : 'Export this report (CSV)'}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <nav className="space-y-1.5" aria-label="Reports">
          {catalog.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedKey(item.key)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                item.key === selectedKey
                  ? 'border-brand bg-brand-light/40 text-brand'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <FileBarChart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {item.label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.description}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              {selected?.supportsVaccineType && (
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Vaccine type</span>
                  <input
                    type="text"
                    value={vaccineType}
                    onChange={(e) => setVaccineType(e.target.value)}
                    placeholder="e.g. FVRCP"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              )}
              <div className="flex flex-wrap gap-1.5 pb-0.5">
                {ranges.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                      preset.startDate === startDate && preset.endDate === endDate
                        ? 'border-brand bg-brand-light/40 text-brand'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            {report?.ignoresDateRange && (
              <p className="mt-2 text-xs text-amber-700">
                This report covers every cat on record and ignores the date range.
              </p>
            )}
          </div>

          {loading && <p className="text-sm text-slate-500">Running report…</p>}

          {!loading && report && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {report.summary.map((item) => (
                  <SummaryCard key={item.label} item={item} />
                ))}
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h2 className="text-sm font-bold text-slate-900">{report.label}</h2>
                  <p className="text-xs text-slate-500">
                    {report.rows.length} row{report.rows.length === 1 ? '' : 's'}
                  </p>
                </div>
                {report.rows.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">
                    No data in this range.
                  </p>
                ) : (
                  <div className="max-h-[32rem] overflow-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr>
                          {report.columns.map((column) => (
                            <th
                              key={column}
                              className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.rows.map((row, rowIndex) => (
                          // Report rows are positional arrays with no stable id.
                          // eslint-disable-next-line react/no-array-index-key
                          <tr key={rowIndex} className="hover:bg-slate-50">
                            {row.map((cell, cellIndex) => (
                              // eslint-disable-next-line react/no-array-index-key
                              <td key={cellIndex} className="whitespace-nowrap px-3 py-2 text-slate-700">
                                {cell === '' || cell == null ? '—' : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
