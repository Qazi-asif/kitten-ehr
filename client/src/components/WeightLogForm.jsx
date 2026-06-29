import { useState } from 'react';

const initialFormState = {
  weightGrams: '',
  date: '',
  notes: '',
};

function WeightLogForm({ onSubmit }) {
  const [form, setForm] = useState(initialFormState);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      weightGrams: Number.parseFloat(form.weightGrams),
    });
    setForm(initialFormState);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Log Weight</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Weight (grams)</span>
          <input type="number" name="weightGrams" value={form.weightGrams} onChange={handleChange} required min="1" step="1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Date</span>
          <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Notes</span>
          <input type="text" name="notes" value={form.notes} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <button type="submit" className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
        Save Weight
      </button>
    </form>
  );
}

export default WeightLogForm;
