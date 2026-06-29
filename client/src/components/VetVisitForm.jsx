import { useState } from 'react';

const initialFormState = {
  date: '',
  clinic: '',
  vetName: '',
  reason: '',
  apptType: '',
  notes: '',
};

function VetVisitForm({ onSubmit }) {
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
      <h3 className="mb-3 text-sm font-semibold text-gray-900">Add New Vet Visit</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Date</span>
          <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Clinic</span>
          <input type="text" name="clinic" value={form.clinic} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Vet Name</span>
          <input type="text" name="vetName" value={form.vetName} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Appointment Type</span>
          <input type="text" name="apptType" value={form.apptType} onChange={handleChange} placeholder="e.g. Wellness, Emergency" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-700">Reason</span>
          <input type="text" name="reason" value={form.reason} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-700">Notes</span>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <button type="submit" className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
        Save Vet Visit
      </button>
    </form>
  );
}

export default VetVisitForm;
