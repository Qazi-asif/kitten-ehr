import { useState } from 'react';
import { createLitter } from '../../services/api';

function LitterSelect({
  value,
  litters,
  onChange,
  onLittersChange,
  disabled = false,
  className = '',
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newLitter, setNewLitter] = useState({ name: '', intakeDate: '', notes: '' });

  async function handleCreateLitter(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const created = await createLitter(newLitter);
      onLittersChange([...litters, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(String(created.id));
      setNewLitter({ name: '', intakeDate: '', notes: '' });
      setShowCreate(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
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
        onClick={() => setShowCreate((prev) => !prev)}
        disabled={disabled}
        className="mt-2 inline-flex items-center rounded-lg border border-brand/30 bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/10 disabled:opacity-60"
      >
        {showCreate ? 'Cancel' : '+ New litter group'}
      </button>
      {showCreate && (
        <form onSubmit={handleCreateLitter} className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <p className="text-xs font-medium text-emerald-900">
            Create a group for kittens from the same intake (e.g. siblings rescued together).
          </p>
          {createError && <p className="mt-2 text-xs text-red-600">{createError}</p>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">Group name</span>
              <input
                required
                value={newLitter.name}
                onChange={(e) => setNewLitter({ ...newLitter, name: e.target.value })}
                placeholder="Spring Alley Litter"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Intake date</span>
              <input
                type="date"
                required
                value={newLitter.intakeDate}
                onChange={(e) => setNewLitter({ ...newLitter, intakeDate: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</span>
              <input
                value={newLitter.notes}
                onChange={(e) => setNewLitter({ ...newLitter, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {creating ? 'Saving...' : 'Save litter group'}
          </button>
        </form>
      )}
    </div>
  );
}

export default LitterSelect;
