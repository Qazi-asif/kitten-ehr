const STATUS_STYLES = {
  CREATED: 'bg-sky-100 text-sky-800',
  DRAFT: 'bg-sky-100 text-sky-800',
  SENT: 'bg-amber-100 text-amber-800',
  SIGNED: 'bg-emerald-100 text-emerald-800',
  VOID: 'bg-slate-100 text-slate-600',
};

function ContractStatusBadge({ status, className = '' }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.VOID;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}>
      {status || '—'}
    </span>
  );
}

export default ContractStatusBadge;
