import { useEffect, useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { createLitter } from '../../services/api';

const EMPTY_FORM = {
  name: '',
  intakeDate: '',
};

function CreateLitterModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setError('');
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createLitter({
        name: form.name.trim(),
        intakeDate: form.intakeDate,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create litter group');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close create litter dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-litter-title"
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_40px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 id="create-litter-title" className="text-sm font-semibold text-slate-800">
            New Litter Group
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-5 py-1">
            <label className="flex items-center gap-3 border-b border-slate-100 py-3">
              <span className="w-24 shrink-0 text-sm text-slate-500">Name</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Spring Alley Litter"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="flex items-center gap-3 border-b border-slate-100 py-3">
              <span className="w-24 shrink-0 text-sm text-slate-500">Intake date</span>
              <input
                type="date"
                name="intakeDate"
                value={form.intakeDate}
                onChange={handleChange}
                required
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none [color-scheme:light]"
              />
              <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </label>
          </div>

          <div className="mx-5 my-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-xs leading-relaxed text-slate-500">
              Group kittens rescued together (e.g. siblings from the same intake). You can assign kittens to this group when creating or editing a profile.
            </p>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center overflow-hidden rounded-full bg-brand shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              <span className="px-5 py-2 text-sm font-semibold text-white">
                {saving ? 'Saving...' : 'Save'}
              </span>
              <span className="flex items-center self-stretch border-l border-white/25 px-2.5 text-white">
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60"
              aria-label="Discard"
              title="Discard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateLitterModal;
