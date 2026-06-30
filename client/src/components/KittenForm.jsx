import { useState } from 'react';
import ProfilePhotoUpload from './ProfilePhotoUpload';
import LitterSelect from './admin/LitterSelect';

const STATUS_OPTIONS = [
  'In Foster Care',
  'Available for Adoption',
  'Adopted',
  'Transferred',
  'Deceased',
];

const SEX_OPTIONS = ['', 'Male', 'Female'];
const FIXED_STATUS_OPTIONS = ['', 'Intact', 'Spayed/Neutered'];

const initialFormState = {
  name: '',
  breed: '',
  color: '',
  status: 'In Foster Care',
  litterId: '',
  fosterId: '',
  dateOfBirth: '',
  sex: '',
  fixedStatus: '',
  rescueStory: '',
};

function KittenForm({ onSubmit, litters = [], onLittersChange, fosters = [], submitting = false }) {
  const [form, setForm] = useState(initialFormState);
  const [photoFile, setPhotoFile] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      kittenData: {
        name: form.name,
        breed: form.breed,
        color: form.color,
        status: form.status,
        dateOfBirth: form.dateOfBirth || null,
        sex: form.sex,
        fixedStatus: form.fixedStatus,
        rescueStory: form.rescueStory,
        litterId: form.litterId ? Number.parseInt(form.litterId, 10) : null,
        currentFosterId: form.fosterId ? Number.parseInt(form.fosterId, 10) : null,
      },
      photoFile,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-900">Create Kitten Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Add basic info and upload a profile photo in one step.</p>
      </div>

      <div className="space-y-6 p-6">
        <ProfilePhotoUpload
          onFileSelect={setPhotoFile}
          label="Profile Photo"
          hint="Required for public adoption pages. You can change this later on the kitten detail page."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Breed</span>
            <input type="text" name="breed" value={form.breed} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Color</span>
            <input type="text" name="color" value={form.color} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Date of Birth</span>
            <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Sex</span>
            <select name="sex" value={form.sex} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {SEX_OPTIONS.map((option) => (
                <option key={option || 'unset'} value={option}>{option || 'Not specified'}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Fixed Status</span>
            <select name="fixedStatus" value={form.fixedStatus} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {FIXED_STATUS_OPTIONS.map((option) => (
                <option key={option || 'unset'} value={option}>{option || 'Not specified'}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
            <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Litter Group</span>
            <LitterSelect
              value={form.litterId}
              litters={litters}
              onChange={(value) => setForm((prev) => ({ ...prev, litterId: value }))}
              onLittersChange={onLittersChange || (() => {})}
              disabled={submitting}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Foster Home</span>
            <select name="fosterId" value={form.fosterId} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">No foster assigned</option>
              {fosters.map((foster) => (
                <option key={foster.id} value={foster.id}>{foster.name}</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Rescue Story</span>
            <textarea name="rescueStory" value={form.rescueStory} onChange={handleChange} rows={3} placeholder="How was this kitten rescued?" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {submitting ? 'Saving profile...' : 'Save Kitten Profile'}
        </button>
      </div>
    </form>
  );
}

export default KittenForm;
