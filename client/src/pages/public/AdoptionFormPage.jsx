import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { submitApplication } from '../../services/publicApi';

function AdoptionFormPage() {
  const [params] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    kittenInterest: params.get('kitten') || '',
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
        {['fullName', 'email', 'phone', 'address', 'kittenInterest', 'experience', 'household'].map((field) => (
          <label key={field} className="block">
            <span className="mb-1 block text-sm font-medium capitalize text-gray-700">{field.replace(/([A-Z])/g, ' $1')}</span>
            <input name={field} value={form[field]} onChange={handleChange} required={field !== 'kittenInterest'} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Additional Message</span>
          <textarea name="message" value={form.message} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Submit Application</button>
      </form>
    </div>
  );
}

export default AdoptionFormPage;
