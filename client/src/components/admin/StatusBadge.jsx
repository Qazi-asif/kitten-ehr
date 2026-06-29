const statusBadgeClass = {
  'In Foster Care': 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  'Available for Adoption': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Adopted: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  Transferred: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  Deceased: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  'Medical Hold': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

function StatusBadge({ status }) {
  const badgeClass = statusBadgeClass[status] ?? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
