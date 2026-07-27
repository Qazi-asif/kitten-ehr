import { useEffect, useState } from 'react';

const emptyForm = {
  date: '',
  clinic: '',
  vetName: '',
  reason: '',
  apptType: '',
  notes: '',
};

function VetVisitForm({ onSubmit, initialValues = null, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(initialValues?.id);

  useEffect(() => {
    if (initialValues) {
      setForm({
        date: initialValues.date ? String(initialValues.date).slice(0, 10) : '',
        clinic: initialValues.clinic || '',
        vetName: initialValues.vetName || '',
        reason: initialValues.reason || '',
        apptType: initialValues.apptType || '',
        notes: initialValues.notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [initialValues]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form, initialValues);
    if (!isEditing) setForm(emptyForm);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        {isEditing ? 'Edit Vet Visit' : 'Add New Vet Visit'}
      </h3>
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
      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
          {isEditing ? 'Update Vet Visit' : 'Save Vet Visit'}
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

export default VetVisitForm;
