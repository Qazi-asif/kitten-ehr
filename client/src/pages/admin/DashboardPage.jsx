import { Link } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  Cat,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSignature,
  FlaskConical,
  Heart,
  HeartHandshake,
  Users,
} from 'lucide-react';
import { fetchContractStats } from '../../services/api';
import { fetchDashboardMetrics } from '../../services/dashboardApi';
import { resolveContractKittenName } from '../../utils/contractAudit';
import { getApplicationSummary, resolveKittenOfInterest } from '../../utils/applicationFormData';
import { toPacificDateString, formatPacificDisplay } from '../../utils/pacificDate';
import { useAuth } from '../../context/AuthContext';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STAT_CARDS = [
  { key: 'totalKittens', label: 'Total Kittens', icon: Cat, color: 'text-sky-600 bg-sky-50' },
  { key: 'availableKittens', label: 'Available Kittens', icon: Heart, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'totalAdopted', label: 'Total Adopted', icon: ClipboardList, color: 'text-amber-600 bg-amber-50' },
  { key: 'activeFosters', label: 'Total Fosters', icon: Users, color: 'text-purple-600 bg-purple-50' },
  { key: 'euthanasiaPulls', label: 'Euthanasia Pull Rescues', icon: HeartHandshake, color: 'text-rose-600 bg-rose-50' },
  { key: 'tnrReleases', label: 'TNR Releases', icon: FlaskConical, color: 'text-indigo-600 bg-indigo-50' },
];

const STATUS_ORDER = [
  'Released',
  'Adopted',
  'In Foster Care',
  'Medical Hold',
  'Available for Adoption',
  'Transferred',
  'In Socialization',
  'Deceased',
];

const STATUS_COLORS = {
  Released: '#94A3B8',
  Adopted: '#8B5CF6',
  'In Foster Care': '#F97316',
  'Medical Hold': '#F59E0B',
  'Available for Adoption': '#14B8A6',
  Transferred: '#64748B',
  'In Socialization': '#38BDF8',
  Deceased: '#EF4444',
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function buildReminderRows(metrics) {
  const rows = [];
  const push = (items, tone, iconLabel) => {
    for (const item of items || []) {
      rows.push({
        id: `${iconLabel}-${item.id}-${item.dueDate}`,
        title: item.title,
        kittenName: item.kittenName,
        kittenId: item.kittenId,
        dueDate: item.dueDate,
        urgency: item.urgency,
        tone,
      });
    }
  };

  push(metrics?.vaccinesOverdue, 'rose', 'vax-overdue');
  push(metrics?.vaccinesDueSoon, 'rose', 'vax');
  push(metrics?.medsEndingSoon, 'amber', 'med');
  push(metrics?.upcomingVetVisits, 'sky', 'vet');
  push(metrics?.protocolFollowUps, 'slate', 'protocol');

  for (const alert of metrics?.summaryAlerts || []) {
    rows.push({
      id: `insight-${alert.text}`,
      title: alert.text,
      dueDate: null,
      urgency: alert.severity === 'error' ? 'overdue' : 'dueSoon',
      tone: alert.severity === 'error' ? 'rose' : alert.severity === 'warning' ? 'amber' : 'sky',
    });
  }

  rows.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  return rows.slice(0, 8);
}

const TONE_STYLES = {
  rose: 'bg-rose-50 text-rose-700',
  amber: 'bg-amber-50 text-amber-700',
  sky: 'bg-sky-50 text-sky-700',
  purple: 'bg-purple-50 text-purple-700',
  slate: 'bg-slate-100 text-slate-700',
};

function StatusDonut({ statusCounts }) {
  const segments = useMemo(() => {
    const ordered = STATUS_ORDER
      .map((status) => ({
        status,
        value: Number(statusCounts?.[status] || 0),
        color: STATUS_COLORS[status] || '#94A3B8',
      }))
      .filter((s) => s.value > 0);

    const extras = Object.entries(statusCounts || {})
      .filter(([status]) => !STATUS_ORDER.includes(status))
      .map(([status, value]) => ({
        status,
        value: Number(value || 0),
        color: STATUS_COLORS[status] || '#94A3B8',
      }))
      .filter((s) => s.value > 0);

    return [...ordered, ...extras];
  }, [statusCounts]);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cumulative = 0;
  const gradient = segments
    .map((s) => {
      const start = cumulative;
      cumulative += (s.value / (total || 1)) * 100;
      return `${s.color} ${start}% ${cumulative}%`;
    })
    .join(', ');

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center">
      <div
        className="relative h-44 w-44 shrink-0 rounded-full"
        style={{ background: total > 0 ? `conic-gradient(${gradient})` : '#E2E8F0' }}
      >
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
          <span className="text-3xl font-bold text-slate-900">{total}</span>
          <span className="text-xs font-medium text-slate-500">Total</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {(segments.length ? segments : STATUS_ORDER.map((status) => ({
          status,
          value: 0,
          color: STATUS_COLORS[status],
        }))).map((s) => (
          <li key={s.status} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="flex-1 text-slate-600">{s.status}</span>
            <span className="font-semibold text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardMonthCalendar({ events }) {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const todayKey = toPacificDateString(new Date());
  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of events || []) {
      const key = toPacificDateString(event.date);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list = [];
    for (let i = 0; i < startOffset; i += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(new Date(year, month, day));
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [monthDate]);

  const monthLabel = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">{monthLabel}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-1">{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const isToday = key === todayKey;
          const dayEvents = eventsByDay.get(key) || [];
          return (
            <div
              key={key}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                isToday ? 'bg-brand text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="font-semibold">{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span className={`mt-0.5 flex gap-0.5 ${isToday ? '' : ''}`}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <span
                      key={event.id}
                      className={`h-1.5 w-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-brand'}`}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contractStats, setContractStats] = useState({
    total: 0,
    created: 0,
    sent: 0,
    signed: 0,
    void: 0,
    recentSigned: [],
  });

  const load = useCallback(async () => {
    const [metricsData, contractsData] = await Promise.all([
      fetchDashboardMetrics(),
      fetchContractStats().catch(() => ({
        total: 0, created: 0, sent: 0, signed: 0, void: 0, recentSigned: [],
      })),
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

  const reminderRows = useMemo(() => buildReminderRows(metrics), [metrics]);
  const pendingApplications = metrics?.pendingApplications ?? [];
  const appCounts = metrics?.applicationStatusCounts || {};
  const pendingTotal = (appCounts.New || 0) + (appCounts['Under Review'] || 0) + (appCounts.Approved || 0);
  const contractPending = (contractStats.created || 0) + (contractStats.sent || 0);

  return (
    <div className="space-y-6">
      {/* Six stat tiles */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="rounded-xl border border-slate-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {loading ? '—' : (metrics?.[key] ?? 0)}
                </p>
              </div>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle: Donut | Reminders | Calendar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <h2 className="mb-4 text-base font-bold text-slate-900">Kittens by Status</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <StatusDonut statusCounts={metrics?.statusCounts} />
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Upcoming Reminders</h2>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading reminders…</p>
          ) : reminderRows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No upcoming reminders. Vaccines, deworming, vet visits, foster follow-ups, and protocol reviews appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {reminderRows.map((row) => (
                <li
                  key={row.id}
                  className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 ${TONE_STYLES[row.tone] || TONE_STYLES.slate}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {row.title}
                      {row.kittenId && row.kittenName ? (
                        <>
                          {' '}
                          <Link to={`/admin/kittens/${row.kittenId}`} className="underline hover:opacity-80">
                            {row.kittenName}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-medium opacity-80">
                    {row.dueDate ? formatPacificDisplay(row.dueDate) : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-right">
            <Link to="/admin/kittens" className="text-sm font-semibold text-brand hover:underline">
              View all reminders
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="mb-1 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-brand" />
            <span className="sr-only">Calendar</span>
          </div>
          <DashboardMonthCalendar events={metrics?.upcomingEvents || []} />
          <div className="mt-3 text-right">
            <Link to="/admin/calendar" className="text-sm font-semibold text-brand hover:underline">
              View calendar
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom: Contracts | Applications */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Contract Status</h2>
            </div>
            <Link to="/admin/contracts" className="text-sm font-semibold text-brand hover:underline">
              View all contracts
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Total', value: contractStats.total, style: 'bg-slate-50 text-slate-900' },
              { label: 'Pending', value: contractPending, style: 'bg-amber-50 text-amber-800' },
              { label: 'Signed', value: contractStats.signed, style: 'bg-emerald-50 text-emerald-800' },
              { label: 'Void', value: contractStats.void, style: 'bg-slate-100 text-slate-600' },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg px-3 py-2 ${item.style}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide">{item.label}</p>
                <p className="mt-0.5 text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          {(contractStats.recentSigned || []).length === 0 ? (
            <p className="text-sm text-slate-500">No signed contracts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Kitten</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Signer</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Type</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Signed</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contractStats.recentSigned.map((contract) => (
                    <tr key={contract.id} className="hover:bg-slate-50">
                      <td className="px-2 py-2.5 text-sm font-medium text-slate-900">
                        {resolveContractKittenName(contract)}
                      </td>
                      <td className="px-2 py-2.5 text-sm text-slate-600">{contract.signerName}</td>
                      <td className="px-2 py-2.5 text-sm text-slate-600">{contract.type}</td>
                      <td className="px-2 py-2.5 text-sm text-slate-500">
                        {contract.signedAt ? formatPacificDisplay(contract.signedAt) : '—'}
                      </td>
                      <td className="px-2 py-2.5 text-sm">
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

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">Pending Applications</h2>
            </div>
            <Link to="/admin/applications" className="text-sm font-semibold text-brand hover:underline">
              View all applications
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Total', value: pendingTotal || pendingApplications.length, style: 'bg-slate-50 text-slate-900' },
              { label: 'New', value: appCounts.New || 0, style: 'bg-sky-50 text-sky-800' },
              { label: 'In Review', value: appCounts['Under Review'] || 0, style: 'bg-amber-50 text-amber-800' },
              { label: 'Approved', value: appCounts.Approved || 0, style: 'bg-emerald-50 text-emerald-800' },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg px-3 py-2 ${item.style}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide">{item.label}</p>
                <p className="mt-0.5 text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          {pendingApplications.length === 0 ? (
            <p className="text-sm text-slate-500">No pending applications right now.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Applicant</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Type</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Kitten</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Submitted</th>
                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApplications.slice(0, 5).map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-2 py-2.5 text-sm font-medium text-slate-900">
                        {getApplicationSummary(app.formData)}
                      </td>
                      <td className="px-2 py-2.5 text-sm text-slate-600">{app.type}</td>
                      <td className="px-2 py-2.5 text-sm text-slate-600">
                        {resolveKittenOfInterest(app.formData, app.kittenOfInterest) || 'Unspecified'}
                      </td>
                      <td className="px-2 py-2.5 text-sm text-slate-600">{app.status}</td>
                      <td className="px-2 py-2.5 text-sm text-slate-500">
                        {formatPacificDisplay(app.createdAt)}
                      </td>
                      <td className="px-2 py-2.5 text-sm">
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
      </div>

      {/* Quiet unused user ref — greeting lives in AdminLayout header */}
      {user ? null : null}
    </div>
  );
}

export default DashboardPage;
