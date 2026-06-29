import { useState } from 'react';

const STATUS_OPTIONS = ['Active', 'Completed', 'Discontinued'];

const initialFormState = {
  name: '',
  dose: '',
  frequency: '',
  startDate: '',
  status: 'Active',
  notes: '',
};

function MedicationForm({ onSubmit }) {
  const [form, setForm] = useState(initialFormState);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
    setForm(initialFormState);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Add New Medication</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Name</span>
          <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Dose</span>
          <input type="text" name="dose" value={form.dose} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Frequency</span>
          <input type="text" name="frequency" value={form.frequency} onChange={handleChange} placeholder="e.g. twice daily" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Start Date</span>
          <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Status</span>
          <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-700">Notes</span>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <button type="submit" className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
        Save Medication
      </button>
    </form>
  );
}

export default MedicationForm;
