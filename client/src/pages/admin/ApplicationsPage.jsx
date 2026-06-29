import { useCallback, useEffect, useState } from 'react';
import { fetchApplications, updateApplicationStatus } from '../../services/api';

const STATUS_OPTIONS = ['New', 'Under Review', 'Approved', 'Denied'];

function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchApplications(filter || undefined);
    setApplications(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, status) {
    await updateApplicationStatus(id, status);
    await load();
    if (selected?.id === id) setSelected((prev) => ({ ...prev, status }));
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Applications</h1>

      <div className="mb-4">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{app.type}</td>
                    <td className="px-4 py-3 text-sm">{app.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <button type="button" onClick={() => setSelected(app)} className="text-emerald-700 hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{selected.type} Application #{selected.id}</h2>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-gray-700">Status</span>
                <select
                  value={selected.status}
                  onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                {JSON.stringify(JSON.parse(selected.formData), null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ApplicationsPage;
