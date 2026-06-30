import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import HouseholdPetsSection from './HouseholdPetsSection';
import { submitApplication } from '../services/publicApi';

const APPLICATION_TYPES = ['Adoption', 'Foster'];
const OWN_OR_RENT_OPTIONS = ['', 'Own', 'Rent'];

function getPrefilledKittenInterest(params) {
  return params.get('kitten') || params.get('name') || params.get('kittenId') || params.get('id') || '';
}

function ApplicationForm({ defaultType = 'Adoption' }) {
  const [params] = useSearchParams();
  const prefilledKitten = getPrefilledKittenInterest(params);
  const lockedKitten = Boolean(prefilledKitten);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [applicationType, setApplicationType] = useState(
    APPLICATION_TYPES.includes(defaultType) ? defaultType : 'Adoption',
  );
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    kittenOfInterest: prefilledKitten,
    ownOrRent: '',
    currentPets: [],
    experience: '',
    experienceLevel: '',
    homeType: '',
    availability: '',
    message: '',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        kittenOfInterest: form.kittenOfInterest,
        ownOrRent: form.ownOrRent,
        currentPets: form.currentPets,
        message: form.message,
      };

      if (applicationType === 'Adoption') {
        payload.experience = form.experience;
      } else {
        payload.experienceLevel = form.experienceLevel;
        payload.homeType = form.homeType;
        payload.availability = form.availability;
      }

      await submitApplication(applicationType, payload);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-emerald-800">Application Submitted!</h1>
        <p className="mt-4 text-gray-600">
          Thank you! Our team will review your {applicationType.toLowerCase()} application and be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Application</h1>
      <p className="mb-8 text-gray-600">Tell us about yourself and the home you can provide.</p>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-md">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Application Type</span>
          <select
            value={applicationType}
            onChange={(e) => setApplicationType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {APPLICATION_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

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
          <span className="mb-1 block text-sm font-medium text-gray-700">Own or Rent</span>
          <select name="ownOrRent" value={form.ownOrRent} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select</option>
            {OWN_OR_RENT_OPTIONS.filter(Boolean).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Kitten(s) of Interest</span>
          <input
            name="kittenOfInterest"
            value={form.kittenOfInterest}
            onChange={handleChange}
            disabled={lockedKitten}
            placeholder={applicationType === 'Foster' ? 'Optional — specific kitten you would like to foster' : 'Which kitten are you interested in adopting?'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-700"
          />
          {lockedKitten && (
            <p className="mt-1 text-xs text-emerald-700">Pre-filled from the kitten profile you selected.</p>
          )}
        </label>

        <HouseholdPetsSection
          pets={form.currentPets}
          onChange={(currentPets) => setForm((prev) => ({ ...prev, currentPets }))}
        />

        {applicationType === 'Adoption' ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Experience with Cats</span>
            <input name="experience" value={form.experience} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Experience Level</span>
              <input name="experienceLevel" value={form.experienceLevel} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Home Type</span>
              <input name="homeType" value={form.homeType} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Availability</span>
              <input name="availability" value={form.availability} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Additional Message</span>
          <textarea name="message" value={form.message} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}

export default ApplicationForm;
