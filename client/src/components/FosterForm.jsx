import { useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { CAPABILITY_OPTIONS, EXPERIENCE_LEVELS } from '../utils/fosterCapabilities';

const initialFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  emergencyContact: '',
  experienceLevel: 'Beginner',
  maxKittens: 2,
  notes: '',
};

function FosterForm({ onSubmit, submitting = false }) {
  const [form, setForm] = useState(initialFormState);
  const [capabilities, setCapabilities] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleCapability(value) {
    setCapabilities((prev) =>
      prev.includes(value) ? prev.filter((flag) => flag !== value) : [...prev, value],
    );
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      maxKittens: Number.parseInt(form.maxKittens, 10) || 0,
      capabilities,
      photoFile,
    });
    setForm(initialFormState);
    setCapabilities([]);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Add Foster Home</h2>
      <p className="mb-5 text-sm text-slate-500">Create a foster contact with capabilities and capacity details.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Photo</span>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {photoPreview ? (
              <img src={photoPreview} alt="Foster preview" className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full flex-col items-center justify-center text-slate-400">
                <Camera className="h-8 w-8" />
                <span className="mt-2 text-xs font-medium">No photo yet</span>
              </div>
            )}
          </div>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-brand/30 bg-brand-light px-3 py-2 text-sm font-semibold text-brand">
            <Upload className="h-4 w-4" />
            Upload Photo
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Emergency Contact</span>
            <input type="text" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
            <input type="text" name="address" value={form.address} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Experience Level</span>
            <select name="experienceLevel" value={form.experienceLevel} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Max Kittens Capacity</span>
            <input type="number" min="0" max="50" name="maxKittens" value={form.maxKittens} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-sm font-medium text-slate-700">Capabilities</legend>
            <div className="flex flex-wrap gap-4">
              {CAPABILITY_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={capabilities.includes(option.value)}
                    onChange={() => toggleCapability(option.value)}
                    className="rounded border-slate-300"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {submitting ? 'Saving Foster...' : 'Save Foster'}
      </button>
    </form>
  );
}

export default FosterForm;
