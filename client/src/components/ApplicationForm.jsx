import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import HouseholdPetsSection from './HouseholdPetsSection';
import { submitApplication } from '../services/publicApi';
import { CheckCircle2, Send } from 'lucide-react';

const OWN_OR_RENT_OPTIONS = ['', 'Own', 'Rent'];

const FORM_COPY = {
  Adoption: {
    title: 'Adoption Application',
    subtitle: 'Tell us about yourself and the forever home you can provide.',
    submitLabel: 'Submit Adoption Application',
    successMessage: 'Thank you! Our team will review your adoption application and be in touch soon.',
  },
  Foster: {
    title: 'Foster Application',
    subtitle: 'Tell us about yourself, your home, and your availability to foster.',
    submitLabel: 'Submit Foster Application',
    successMessage: 'Thank you for wanting to foster! We will review your application and contact you.',
  },
};

function getPrefilledKittenInterest(params) {
  return params.get('kitten') || params.get('name') || params.get('kittenId') || params.get('id') || '';
}

function ApplicationForm({ defaultType = 'Adoption', lockType = true }) {
  const [params] = useSearchParams();
  const prefilledKitten = getPrefilledKittenInterest(params);
  const lockedKitten = Boolean(prefilledKitten);
  const applicationType = defaultType === 'Foster' ? 'Foster' : 'Adoption';
  const copy = FORM_COPY[applicationType];
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
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
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 bg-brand/10 rounded-full flex items-center justify-center">
             <CheckCircle2 className="h-12 w-12 text-brand" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Application Submitted!</h2>
        <p className="text-lg text-slate-600">{copy.successMessage}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
      
      {error && <div className="mb-8 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-sm font-medium text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="rounded-3xl border border-brand/20 bg-white p-8 lg:p-12 shadow-sm">
        
        {/* Form Header */}
        <div className="mb-10 pb-8 border-b border-slate-100">
           <h2 className="text-2xl font-bold text-brand">{copy.title} Details</h2>
           <p className="mt-2 text-slate-600">Please fill out all required fields marked with an asterisk (*).</p>
        </div>

        {!lockType && (
          <div className="mb-8 rounded-xl bg-brand/5 px-5 py-4 text-sm text-slate-700 border border-brand/10">
            Application type: <span className="font-bold text-brand">{applicationType}</span>
          </div>
        )}

        {/* Section: Applicant Information */}
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand text-xs">1</span>
          Applicant Information
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-10">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Full Name *</span>
            <input name="fullName" value={form.fullName} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Email *</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Phone *</span>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Full Address *</span>
            <input name="address" value={form.address} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
          </label>
        </div>

        {/* Section: Household & Preferences */}
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand text-xs">2</span>
          Household & Preferences
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-10">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Own or Rent *</span>
            <select name="ownOrRent" value={form.ownOrRent} onChange={handleChange} required className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm bg-white focus:border-brand focus:ring-brand">
              <option value="" disabled>Select an option</option>
              {OWN_OR_RENT_OPTIONS.filter(Boolean).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Kitten(s) of Interest</span>
            <input
              name="kittenOfInterest"
              value={form.kittenOfInterest}
              onChange={handleChange}
              disabled={lockedKitten}
              placeholder={applicationType === 'Foster' ? 'Specific kitten (optional)' : 'Which kitten?'}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-50 disabled:text-slate-500 focus:border-brand focus:ring-brand"
            />
            {lockedKitten && (
              <p className="mt-2 text-xs font-medium text-brand">✓ Pre-filled from the kitten profile</p>
            )}
          </label>
          
          {applicationType === 'Adoption' ? (
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-800">Experience with Cats *</span>
              <input name="experience" value={form.experience} onChange={handleChange} required placeholder="e.g., Have owned cats before, first time owner" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Experience Level *</span>
                <input name="experienceLevel" value={form.experienceLevel} onChange={handleChange} required placeholder="e.g., Beginner, Experienced" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Home Type *</span>
                <input name="homeType" value={form.homeType} onChange={handleChange} required placeholder="e.g., Apartment, House with yard" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Availability *</span>
                <input name="availability" value={form.availability} onChange={handleChange} required placeholder="e.g., Weekends, Full-time" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
              </label>
            </>
          )}
        </div>

        {/* Section: Current Pets */}
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand text-xs">3</span>
          Current Pets
        </h3>
        <div className="mb-10 bg-slate-50 rounded-2xl p-6 border border-slate-100">
           <HouseholdPetsSection
             pets={form.currentPets}
             onChange={(currentPets) => setForm((prev) => ({ ...prev, currentPets }))}
           />
        </div>
        
        {/* Section: Additional Message */}
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-brand text-xs">4</span>
          Additional Information
        </h3>
        <div className="mb-10">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">Message (Optional)</span>
            <textarea name="message" value={form.message} onChange={handleChange} rows={5} placeholder="Anything else we should know?" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-brand focus:ring-brand" />
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-8 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-10 py-4 text-sm font-bold text-white shadow-md hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting Application...' : copy.submitLabel}
            {!submitting && <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApplicationForm;
