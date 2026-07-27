import { useEffect, useState } from 'react';
import { toPacificDateTimeLocal } from '../utils/pacificDate';

const emptyForm = () => ({
  weightGrams: '',
  date: toPacificDateTimeLocal(new Date()),
  notes: '',
});

function WeightLogForm({ onSubmit, initialValues = null, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(initialValues?.id);

  useEffect(() => {
    if (initialValues) {
      setForm({
        weightGrams: initialValues.weightGrams != null ? String(Math.round(initialValues.weightGrams)) : '',
        date: initialValues.date ? toPacificDateTimeLocal(initialValues.date) : toPacificDateTimeLocal(new Date()),
        notes: initialValues.notes || '',
      });
    } else {
      setForm(emptyForm());
    }
  }, [initialValues]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      weightGrams: Number.parseFloat(form.weightGrams),
    }, initialValues);
    if (!isEditing) setForm(emptyForm());
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        {isEditing ? 'Edit Weight Log' : 'Log Weight'}
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Weight (grams)</span>
          <input type="number" name="weightGrams" value={form.weightGrams} onChange={handleChange} required min="1" step="1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Date &amp; Time</span>
          <input type="datetime-local" name="date" value={form.date} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Notes</span>
          <input type="text" name="notes" value={form.notes} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
          {isEditing ? 'Update Weight' : 'Save Weight'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default WeightLogForm;
