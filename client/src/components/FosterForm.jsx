import { useState } from 'react';

const initialFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  emergencyContact: '',
  experienceLevel: '',
  notes: '',
};

function FosterForm({ onSubmit }) {
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
    <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Foster</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Name</span>
          <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Phone</span>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
          <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Emergency Contact</span>
          <input type="text" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">Address</span>
          <input type="text" name="address" value={form.address} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Experience Level</span>
          <input type="text" name="experienceLevel" value={form.experienceLevel} onChange={handleChange} placeholder="e.g. Experienced" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-gray-700">Notes</span>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
      </div>
      <button type="submit" className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
        Save Foster
      </button>
    </form>
  );
}

export default FosterForm;
