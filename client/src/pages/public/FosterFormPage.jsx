import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submitApplication } from '../../services/publicApi';

function getPrefilledKittenInterest(params) {
  return params.get('kitten') || params.get('name') || params.get('kittenId') || params.get('id') || '';
}

function FosterFormPage() {
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
    experienceLevel: '',
    hasOtherPets: '',
    homeType: '',
    availability: '',
    message: '',
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await submitApplication('Foster', form);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-emerald-800">Application Submitted!</h1>
        <p className="mt-4 text-gray-600">Thank you for wanting to foster! We will review your application and contact you.</p>
      </div>
    );
  }

  return (
    <div>
      <section className="border-b border-gray-200 bg-white px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold text-gray-900">Foster</h1>
          <p className="mt-2 text-gray-600">Open your home to a kitten in need. We provide supplies and medical care.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl shadow-md">
            <img src="/images/kittens/nugget.jpg" alt="Foster kitten" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Why Foster?</h2>
            <p className="mt-4 leading-relaxed text-gray-600">
              Foster homes are the heart of our rescue. By opening your home temporarily, you save lives and help kittens become confident, adoptable companions.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-gray-600">
              <li>• We cover medical expenses and provide supplies</li>
              <li>• Flexible time commitments — short or long term</li>
              <li>• Full support from our experienced foster team</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="text-2xl font-bold text-gray-900">Foster Application</h2>
            <p className="mt-2 text-gray-600">Tell us about yourself and your home.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
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
                  placeholder="Optional — specific kitten you'd like to foster"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-700"
                />
                {lockedKitten && (
                  <p className="mt-1 text-xs text-emerald-700">Pre-filled from the kitten profile you selected.</p>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Experience Level</span>
                <input name="experienceLevel" value={form.experienceLevel} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Other Pets at Home</span>
                <input name="hasOtherPets" value={form.hasOtherPets} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Home Type</span>
                <input name="homeType" value={form.homeType} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Availability</span>
                <input name="availability" value={form.availability} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Additional Message</span>
                <textarea name="message" value={form.message} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                Submit Application
              </button>
            </form>
          </div>
          <div className="order-1 overflow-hidden rounded-xl shadow-md lg:order-2">
            <img src="/images/gallery/rescue-2.jpg" alt="Foster care" className="aspect-[4/3] w-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FosterFormPage;
