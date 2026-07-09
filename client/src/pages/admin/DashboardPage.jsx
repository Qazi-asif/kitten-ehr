import { Link } from 'react-router-dom';
import { ClipboardList, FileSignature, HeartHandshake } from 'lucide-react';
import { Cat, Heart, Users } from 'lucide-react';
import KittenPhoto from '../../components/KittenPhoto';
import {
  fetchContractStats,
} from '../../services/api';
import { fetchDashboardMetrics } from '../../services/dashboardApi';
import { resolveContractKittenName } from '../../utils/contractAudit';
import { getApplicationSummary, resolveKittenOfInterest } from '../../utils/applicationFormData';
import { useCallback, useEffect, useMemo, useState } from 'react';

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const statCards = [
  { key: 'totalKittens', label: 'Total Kittens', icon: Cat, color: 'text-brand bg-brand-light', format: 'number' },
  { key: 'availableKittens', label: 'Available Kittens', icon: Heart, color: 'text-emerald-600 bg-emerald-50', format: 'number' },
  { key: 'totalAdopted', label: 'Total Adopted', icon: ClipboardList, color: 'text-amber-600 bg-amber-50', format: 'number' },
  { key: 'activeFosters', label: 'Total Fosters', icon: Users, color: 'text-purple-600 bg-purple-50', format: 'number' },
  { key: 'euthanasiaPulls', label: 'Euthanasia-Pull Rescues', icon: HeartHandshake, color: 'text-rose-600 bg-rose-50', format: 'number' },
];

const STATUS_COLORS = {
  'Available for Adoption': '#10B981',
  'In Foster Care': '#F97316',
  Adopted: '#8B5CF6',
  'Medical Hold': '#F59E0B',
  Transferred: '#94A3B8',
  Deceased: '#EF4444',
};

const REMINDER_GROUPS = [
  {
    key: 'vaccines',
    label: 'Vaccines',
    items: (metrics) => [
      ...(metrics?.vaccinesOverdue ?? []),
      ...(metrics?.vaccinesDueSoon ?? []),
    ],
  },
  {
    key: 'medications',
    label: 'Medications',
    items: (metrics) => metrics?.medsEndingSoon ?? [],
  },
  {
    key: 'vetVisits',
    label: 'Vet Visits',
    items: (metrics) => metrics?.upcomingVetVisits ?? [],
  },
  {
    key: 'protocols',
    label: 'Protocols',
    items: (metrics) => metrics?.protocolFollowUps ?? [],
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatRelativeDueDate(dueDate, urgency) {
  if (!dueDate) return '';
  const target = new Date(dueDate);
  const diffMs = target.getTime() - Date.now();
  const days = Math.max(1, Math.ceil(Math.abs(diffMs) / MS_PER_DAY));
  if (urgency === 'overdue' || diffMs < 0) {
    return `Overdue by ${days} day${days === 1 ? '' : 's'}`;
  }
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

function ReminderRow({ alert }) {
  const isOverdue = alert.urgency === 'overdue';
  return (
    <li className={`rounded-lg border px-4 py-3 ${isOverdue ? 'border-red-100 bg-red-50' : 'border-amber-100 bg-amber-50'}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className={`text-sm font-semibold ${isOverdue ? 'text-red-800' : 'text-amber-900'}`}>
            {alert.title}
            {' — '}
            <Link to={`/admin/kittens/${alert.kittenId}`} className="text-brand hover:underline">
              {alert.kittenName}
            </Link>
          </p>
          <p className={`mt-1 text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-amber-700'}`}>
            {formatRelativeDueDate(alert.dueDate, alert.urgency)}
          </p>
        </div>
      </div>
    </li>
  );
}

function StatusDonut({ statusCounts }) {
  const segments = useMemo(() => {
    return Object.entries(statusCounts || {}).map(([status, value]) => ({
      status,
      value,
      color: STATUS_COLORS[status] || '#94A3B8',
    }));
  }, [statusCounts]);

  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let cumulative = 0;
  const gradient = segments
    .map((s) => {
      const start = cumulative;
      cumulative += (s.value / total) * 100;
      return `${s.color} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div
        className="relative h-40 w-40 shrink-0 rounded-full"
        style={{ background: total > 0 ? `conic-gradient(${gradient})` : '#E2E8F0' }}
      >
        <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-3xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>
      <ul className="space-y-2">
        {segments.map((s) => (
          <li key={s.status} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.status}</span>
            <span className="font-semibold text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractStats, setContractStats] = useState({
    total: 0,
    sent: 0,
    signed: 0,
    void: 0,
    recentSigned: [],
  });

  const load = useCallback(async () => {
    const [metricsData, contractsData] = await Promise.all([
      fetchDashboardMetrics(),
      fetchContractStats().catch(() => ({ total: 0, sent: 0, signed: 0, void: 0, recentSigned: [] })),
    ]);
    setMetrics(metricsData);
    setContractStats(contractsData);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, [load]);

  const recentIntakes = useMemo(
    () => metrics?.recentIntakes ?? [],
    [metrics],
  );

  const recentAdoptions = useMemo(
    () => metrics?.recentAdoptions ?? [],
    [metrics],
  );

  const pendingApplications = useMemo(
    () => metrics?.pendingApplications ?? [],
    [metrics],
  );

  const medicalConcerns = metrics?.medicalConcerns ?? [];

  const reminderGroups = useMemo(
    () => REMINDER_GROUPS
      .map((group) => ({
        ...group,
        alerts: group.items(metrics),
      }))
      .filter((group) => group.alerts.length > 0),
    [metrics],
  );

  const hasReminders = reminderGroups.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map(({ key, label, icon: Icon, color, format }) => (
          <div key={key} className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading
                    ? '—'
                    : format === 'currency'
                      ? formatCurrency(metrics?.[key])
                      : (metrics?.[key] ?? 0)}
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h2 className="text-base font-bold text-slate-900">Upcoming Reminders</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading reminders...</p>
        ) : !hasReminders ? (
          <p className="mt-4 text-sm text-slate-500">
            No upcoming reminders. Vaccines, medications, vet visits, and protocol follow-ups will appear here.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {reminderGroups.map((group) => (
              <section key={group.key}>
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{group.label}</h3>
                <ul className="mt-3 space-y-2">
                  {group.alerts.map((alert) => (
                    <ReminderRow key={`${group.key}-${alert.id}-${alert.dueDate}`} alert={alert} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Contract Status</h2>
          </div>
          <Link to="/admin/contracts" className="text-sm font-semibold text-brand hover:underline">
            View all contracts
          </Link>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: contractStats.total, style: 'bg-slate-50 text-slate-900' },
            { label: 'Pending', value: contractStats.sent, style: 'bg-amber-50 text-amber-800' },
            { label: 'Signed', value: contractStats.signed, style: 'bg-emerald-50 text-emerald-800' },
            { label: 'Void', value: contractStats.void, style: 'bg-slate-100 text-slate-600' },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg px-4 py-3 ${item.style}`}>
              <p className="text-xs font-semibold uppercase">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        {contractStats.recentSigned?.length === 0 ? (
          <p className="text-sm text-slate-500">No signed contracts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Kitten</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Signer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Signed</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractStats.recentSigned.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 text-sm font-medium text-slate-900">
                      {resolveContractKittenName(contract)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">{contract.signerName}</td>
                    <td className="px-3 py-3 text-sm text-slate-600">{contract.type}</td>
                    <td className="px-3 py-3 text-sm text-slate-500">
                      {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <Link
                        to={`/admin/contracts?review=${contract.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-bold text-slate-900">Kittens by Status</h2>
          <div className="mt-6 flex justify-center">
            <StatusDonut statusCounts={metrics?.statusCounts} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="text-base font-bold text-slate-900">Top Medical Concerns</h2>
          {medicalConcerns.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No active medical concerns recorded.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {medicalConcerns.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Pending Applications</h2>
            <Link to="/admin/applications" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          {pendingApplications.length === 0 ? (
            <p className="text-sm text-slate-500">No new adoption or foster applications right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Applicant</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Kitten</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Submitted</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 text-sm font-medium text-slate-900">{getApplicationSummary(app.formData)}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">{app.type}</td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {resolveKittenOfInterest(app.formData, app.kittenOfInterest) || 'Unspecified'}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">{app.status}</td>
                      <td className="px-3 py-3 text-sm text-slate-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3 text-sm">
                        <Link
                          to={`/admin/applications?id=${app.id}`}
                          className="font-semibold text-brand hover:underline"
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
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Intakes</h2>
            <Link to="/admin/kittens" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          <ul className="space-y-3">
            {recentIntakes.map((kitten) => (
              <li key={kitten.id}>
                <Link to={`/admin/kittens/${kitten.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                  <KittenPhoto kitten={kitten} allowFallback className="h-10 w-10 rounded-full" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{kitten.name}</p>
                    <p className="text-xs text-slate-500">{kitten.litter?.name || 'No litter'} · {kitten.status}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Recent Adoptions</h2>
            <Link to="/admin/kittens" className="text-sm font-semibold text-brand hover:underline">View all</Link>
          </div>
          {recentAdoptions.length === 0 ? (
            <p className="text-sm text-slate-500">No adoptions recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentAdoptions.map((kitten) => (
                <li key={kitten.id}>
                  <Link to={`/admin/kittens/${kitten.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                    <KittenPhoto kitten={kitten} allowFallback className="h-10 w-10 rounded-full" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{kitten.name}</p>
                      <p className="text-xs text-slate-500">Forever home found</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
