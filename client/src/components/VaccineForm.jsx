import { useEffect, useState } from 'react';

const TYPE_OPTIONS = ['FVRCP', 'Rabies', 'FeLV', 'FIV', 'Other'];

const emptyForm = {
  type: 'FVRCP',
  dateGiven: '',
  notes: '',
};

function VaccineForm({ onSubmit, initialValues = null, onCancel }) {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(initialValues?.id);

  useEffect(() => {
    if (initialValues) {
      setForm({
        type: initialValues.type || 'FVRCP',
        dateGiven: initialValues.dateGiven ? String(initialValues.dateGiven).slice(0, 10) : '',
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
        {isEditing ? 'Edit Vaccination' : 'Add New Vaccination'}
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Type</span>
          <select name="type" value={form.type} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-700">Date Given</span>
          <input type="date" name="dateGiven" value={form.dateGiven} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-gray-700">Notes</span>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark">
          {isEditing ? 'Update Vaccination' : 'Save Vaccination'}
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

export default VaccineForm;
