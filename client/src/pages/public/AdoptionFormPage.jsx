import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submitApplication } from '../../services/publicApi';

function getPrefilledKittenInterest(params) {
  return params.get('kitten') || params.get('name') || params.get('kittenId') || params.get('id') || '';
}

function AdoptionFormPage() {
  const [params] = useSearchParams();
  const prefilledKitten = getPrefilledKittenInterest(params);
  const lockedKitten = Boolean(prefilledKitten);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    kittenOfInterest: prefilledKitten,
    experience: '',
    household: '',
    message: '',
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await submitApplication('Adoption', form);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-emerald-800">Application Submitted!</h1>
        <p className="mt-4 text-gray-600">Thank you! Our team will review your adoption application and be in touch soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Adoption Application</h1>
      <p className="mb-8 text-gray-600">Tell us about yourself and the home you can provide.</p>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Full Name</span>
          <input name="fullName" value={form.fullName} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
          <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Phone</span>
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Address</span>
          <input name="address" value={form.address} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Kitten(s) of Interest</span>
          <input
            name="kittenOfInterest"
            value={form.kittenOfInterest}
            onChange={handleChange}
            disabled={lockedKitten}
            placeholder="Which kitten are you interested in adopting?"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-700"
          />
          {lockedKitten && (
            <p className="mt-1 text-xs text-emerald-700">Pre-filled from the kitten profile you selected.</p>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Experience with Cats</span>
          <input name="experience" value={form.experience} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Household</span>
          <input name="household" value={form.household} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Additional Message</span>
          <textarea name="message" value={form.message} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Submit Application
        </button>
      </form>
    </div>
  );
}

export default AdoptionFormPage;
