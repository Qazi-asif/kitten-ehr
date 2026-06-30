import { useState } from 'react';

function AssignKittenForm({ kittens = [], onSubmit, submitting = false }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    kittenId: '',
    intakeDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      kittenId: Number.parseInt(form.kittenId, 10),
      intakeDate: form.intakeDate,
      notes: form.notes,
    });
    setForm({
      kittenId: '',
      intakeDate: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Assign New Kitten
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Assign Kitten to Foster</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Kitten</span>
          <select
            required
            value={form.kittenId}
            onChange={(e) => setForm((prev) => ({ ...prev, kittenId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select a kitten...</option>
            {kittens.map((kitten) => (
              <option key={kitten.id} value={kitten.id}>
                {kitten.name} · {kitten.status}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase text-slate-500">Intake Date</span>
          <input
            type="date"
            required
            value={form.intakeDate}
            onChange={(e) => setForm((prev) => ({ ...prev, intakeDate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold uppercase text-slate-500">Notes</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="Optional placement notes..."
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {submitting ? 'Saving...' : 'Save Placement'}
      </button>
    </form>
  );
}

export default AssignKittenForm;
