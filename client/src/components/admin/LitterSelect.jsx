import { useState } from 'react';
import CreateLitterModal from './CreateLitterModal';

function LitterSelect({
  value,
  litters,
  onChange,
  onLittersChange,
  disabled = false,
  className = '',
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  function handleCreated(created) {
    onLittersChange([...litters, created].sort((a, b) => a.name.localeCompare(b.name)));
    onChange(String(created.id));
  }

  return (
    <div className={className}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
      >
        <option value="">No litter group</option>
        {litters.map((litter) => (
          <option key={litter.id} value={litter.id}>
            {litter.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        disabled={disabled}
        className="mt-2 inline-flex items-center rounded-lg border border-brand/30 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-60"
      >
        + New Litter Group
      </button>
      <CreateLitterModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

export default LitterSelect;
