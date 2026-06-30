import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, TrendingUp } from 'lucide-react';
import { Cat, Heart, Users } from 'lucide-react';
import KittenPhoto from '../../components/KittenPhoto';
import { fetchDashboardStats, fetchFinanceStats, fetchKittens } from '../../services/api';
import { useCallback, useEffect, useMemo, useState } from 'react';

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const statCards = [
  { key: 'activeKittens', label: 'Active Kittens', icon: Cat, color: 'text-brand bg-brand-light', format: 'number' },
  { key: 'availableForAdoption', label: 'Available for Adoption', icon: Heart, color: 'text-emerald-600 bg-emerald-50', format: 'number' },
  { key: 'activeFosters', label: 'Active Fosters', icon: Users, color: 'text-purple-600 bg-purple-50', format: 'number' },
  { key: 'donationsThisMonth', label: 'Donations This Month', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', format: 'currency' },
];

const STATUS_COLORS = {
  'Available for Adoption': '#10B981',
  'In Foster Care': '#F97316',
  Adopted: '#8B5CF6',
  'Medical Hold': '#F59E0B',
  Transferred: '#94A3B8',
  Deceased: '#EF4444',
};

const MEDICAL_CONCERNS = [
  { label: 'Upper Respiratory Infection', count: 8 },
  { label: 'Diarrhea / GI Issues', count: 5 },
  { label: 'Underweight', count: 4 },
  { label: 'Eye Infection', count: 3 },
];

function StatusDonut({ kittens }) {
  const segments = useMemo(() => {
    const counts = {};
    kittens.forEach((k) => {
      counts[k.status] = (counts[k.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      status,
      value,
      color: STATUS_COLORS[status] || '#94A3B8',
    }));
  }, [kittens]);

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
  const [stats, setStats] = useState({
    activeKittens: 0,
    availableForAdoption: 0,
    activeFosters: 0,
    donationsThisMonth: 0,
  });
  const [kittens, setKittens] = useState([]);

  const load = useCallback(async () => {
    const [statsData, kittensData, financeData] = await Promise.all([
      fetchDashboardStats(),
      fetchKittens(),
      fetchFinanceStats().catch(() => ({ income: { month: 0 } })),
    ]);
    setStats({
      ...statsData,
      donationsThisMonth: financeData.income?.month ?? 0,
    });
    setKittens(kittensData);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const recentIntakes = [...kittens]
    .sort((a, b) => new Date(b.intakeDate || b.id) - new Date(a.intakeDate || a.id))
    .slice(0, 4);

  const recentAdoptions = kittens
    .filter((k) => k.status === 'Adopted')
    .slice(0, 4);

  const alerts = [
    { icon: AlertCircle, color: 'text-red-500 bg-red-50', text: 'Vaccines overdue for 3 kittens' },
    { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50', text: 'Medications ending soon — review Panacur course' },
    { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50', text: 'Biscuit cleared for adoption listing' },
    { icon: Info, color: 'text-blue-500 bg-blue-50', text: 'Spring Adoption Fair scheduled July 15' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, color, format }) => (
          <div key={key} className="rounded-xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {format === 'currency' ? formatCurrency(stats[key]) : (stats[key] ?? 0)}
                </p>
                {key === 'donationsThisMonth' && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Monthly income
                  </p>
                )}
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] xl:col-span-1">
          <h2 className="text-base font-bold text-slate-900">Upcoming Alerts</h2>
          <ul className="mt-4 space-y-3">
            {alerts.map(({ icon: Icon, color, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm leading-snug text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] xl:col-span-1">
          <h2 className="text-base font-bold text-slate-900">Kittens by Status</h2>
          <div className="mt-6 flex justify-center">
            <StatusDonut kittens={kittens} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] xl:col-span-1">
          <h2 className="text-base font-bold text-slate-900">Top Medical Concerns</h2>
          <ul className="mt-4 space-y-3">
            {MEDICAL_CONCERNS.map((item) => (
              <li key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item.label}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
