import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchApplications, updateApplicationStatus } from '../../services/api';
import {
  formatApplicationFieldLabel,
  getApplicationSummary,
  parseApplicationFormData,
} from '../../utils/applicationFormData';

const STATUS_OPTIONS = ['New', 'Under Review', 'Approved', 'Denied'];

function ApplicationDetails({ formData }) {
  const fields = useMemo(() => {
    const parsed = parseApplicationFormData(formData);
    return Object.entries(parsed).filter(([, value]) => value != null && value !== '');
  }, [formData]);

  if (fields.length === 0) {
    return <p className="text-sm text-gray-500">No application details recorded.</p>;
  }

  return (
    <dl className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
      {fields.map(([key, value]) => (
        <div key={key} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]">
          <dt className="text-sm font-medium text-gray-500">{formatApplicationFieldLabel(key)}</dt>
          <dd className="text-sm text-gray-900 whitespace-pre-wrap break-words">
            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApplications(filter || undefined);
      setApplications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(id, status) {
    try {
      await updateApplicationStatus(id, status);
      await load();
      if (selected?.id === id) setSelected((prev) => ({ ...prev, status }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Applications</h1>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      No applications found.
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className={`hover:bg-gray-50 ${selected?.id === app.id ? 'bg-emerald-50/50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{getApplicationSummary(app.formData)}</td>
                      <td className="px-4 py-3 text-sm">{app.type}</td>
                      <td className="px-4 py-3 text-sm">{app.status}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <button type="button" onClick={() => setSelected(app)} className="text-emerald-700 hover:underline">
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selected ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{selected.type} Application #{selected.id}</h2>
              <p className="mt-1 text-sm text-gray-500">
                Submitted {new Date(selected.createdAt).toLocaleString()}
              </p>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <select
                  value={selected.status}
                  onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Application Details</h3>
              <ApplicationDetails formData={selected.formData} />
            </div>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              Select an application to view details.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ApplicationsPage;
