import { Cat, ClipboardList, Heart, Users } from 'lucide-react';
import KittenPhoto from '../KittenPhoto';
import KittenDetailPanel from './KittenDetailPanel';

const statCards = [
  { key: 'activeKittens', label: 'Active Kittens', icon: Cat, iconBg: 'bg-blue-100 text-blue-600' },
  { key: 'availableForAdoption', label: 'Available', icon: Heart, iconBg: 'bg-red-100 text-red-600' },
  { key: 'activeFosters', label: 'Active Fosters', icon: Users, iconBg: 'bg-emerald-100 text-emerald-600' },
  { key: 'adoptionsThisYear', label: 'Adopted YTD', icon: ClipboardList, iconBg: 'bg-amber-100 text-amber-600' },
];

const reminders = [
  { label: 'Vaccines Overdue', pill: 'Overdue', pillClass: 'bg-red-100 text-red-700' },
  { label: 'Medications Ending Soon', pill: 'Due Soon', pillClass: 'bg-amber-100 text-amber-700' },
  { label: 'Vet Follow-Ups This Week', pill: 'Scheduled', pillClass: 'bg-blue-100 text-blue-700' },
  { label: 'Adoption Events', pill: 'Upcoming', pillClass: 'bg-emerald-100 text-emerald-700' },
];

function AdminMasterDetail({
  stats,
  kittens,
  selectedKittenId,
  onSelectKitten,
  showStats = true,
}) {
  const recentAdoptions = kittens.filter((k) => k.status === 'Adopted').slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        {showStats && (
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ key, label, icon: Icon, iconBg }) => (
              <div key={key} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full ${iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats[key] ?? 0}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">Upcoming Reminders</h3>
          <ul className="mt-3 space-y-2">
            {reminders.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${item.pillClass}`}>
                  {item.pill}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">Recent Adoptions</h3>
          <ul className="mt-3 space-y-2">
            {recentAdoptions.length === 0 ? (
              <li className="text-sm text-gray-500">No adoptions yet.</li>
            ) : (
              recentAdoptions.map((kitten) => (
                <li key={kitten.id}>
                  <button
                    type="button"
                    onClick={() => onSelectKitten(kitten.id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                      selectedKittenId === kitten.id ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <KittenPhoto kitten={kitten} allowFallback className="h-9 w-9 rounded-full" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{kitten.name}</p>
                      <p className="text-xs text-gray-500">Forever home found</p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">All Kittens</h3>
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {kittens.map((kitten) => (
              <li key={kitten.id}>
                <button
                  type="button"
                  onClick={() => onSelectKitten(kitten.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                    selectedKittenId === kitten.id ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <KittenPhoto kitten={kitten} allowFallback className="h-8 w-8 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{kitten.name}</p>
                    <p className="truncate text-xs text-gray-500">{kitten.status}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="lg:col-span-3">
        <KittenDetailPanel kittenId={selectedKittenId} embedded />
      </div>
    </div>
  );
}

export default AdminMasterDetail;
