import { useEffect, useState } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { fetchPublicSettings, submitContact } from '../../services/publicApi';

const FALLBACK_CONTACT = {
  contactPhone: '(951) 830-1825',
  contactEmail: 'hello@pawsitivetransformations.org',
  contactAddress: '12523 Limonite, Suite 440412\nMira Loma, CA 91752\nRiverside County',
  orgEin: '42-3678960',
};

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  topic: 'Select an option',
  message: '',
};

function ContactPage() {
  const outlet = useOutletContext();
  const location = useLocation();
  const [settings, setSettings] = useState(outlet?.settings ?? FALLBACK_CONTACT);
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchPublicSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [location.key]);

  const contactEmail = settings.contactEmail?.trim() || FALLBACK_CONTACT.contactEmail;
  const contactPhone = settings.contactPhone?.trim() || FALLBACK_CONTACT.contactPhone;
  const orgEin = settings.orgEin?.trim() || FALLBACK_CONTACT.orgEin;
  const addressLines = (settings.contactAddress?.trim() || FALLBACK_CONTACT.contactAddress)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      await submitContact(form);
      setStatus('success');
      setForm(INITIAL_FORM);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 lg:px-8">
        <h1 className="text-6xl font-extrabold tracking-tight text-brand flex items-center gap-3">
          Contact Us
          <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
            <circle cx="25" cy="30" r="9" />
            <circle cx="43" cy="18" r="10" />
            <circle cx="63" cy="18" r="10" />
            <circle cx="81" cy="32" r="9" />
            <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
          </svg>
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">We&apos;d love to hear from you!</p>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-0 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-10 items-stretch">

          <div className="lg:w-1/3 flex flex-col relative">
            <div className="rounded-2xl border border-brand/40 bg-white p-7 relative z-10">
              <h2 className="text-xl font-bold text-brand">Contact Information</h2>

              <ul className="mt-8 space-y-6">
                <li className="flex items-start gap-4">
                  <Phone fill="currentColor" stroke="none" className="mt-1 h-6 w-6 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-brand">Call / Text</p>
                    <p className="font-semibold text-slate-800">{contactPhone}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Mail fill="currentColor" stroke="none" className="mt-1 h-6 w-6 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-brand">Email</p>
                    <a href={`mailto:${contactEmail}`} className="font-semibold text-slate-800 hover:text-brand">
                      {contactEmail}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MapPin fill="currentColor" stroke="none" className="mt-1 h-6 w-6 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-brand">Address</p>
                    <div className="font-semibold text-slate-800 leading-snug">
                      {addressLines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                </li>
              </ul>

              <div className="mt-10 pt-4 font-semibold text-slate-800">
                EIN: {orgEin}
              </div>
            </div>

            <div className="relative mt-auto pt-8 flex items-end">
              <img
                src="/images/contact-kitten.png"
                alt="Cat"
                className="w-full xl:w-11/12 object-contain object-bottom -mb-2 z-10"
              />
              <div className="absolute right-0 bottom-12 w-1/4">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-auto text-brand" style={{ transform: 'rotate(15deg)' }}>
                  <path d="M50 85 C50 85 10 60 10 35 C10 20 25 10 35 25 C45 10 60 20 60 35 C60 60 50 85 50 85 Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M50 85 C60 80 80 65 90 40" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          <div className="lg:w-2/3 pb-16">
            <div className="rounded-2xl border border-brand/40 bg-white p-7 lg:p-10 h-full">
              <h2 className="text-2xl font-bold text-brand">Send Us a Message</h2>

              {status === 'success' ? (
                <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
                  <p className="text-xl font-bold text-emerald-800">Message sent!</p>
                  <p className="mt-2 text-sm text-emerald-700">
                    Thanks for reaching out. We&apos;ll get back to you as soon as possible. Check your inbox for a confirmation.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="mt-6 rounded-lg border border-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8">
                  {status === 'error' && (
                    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">First Name *</span>
                      <input name="firstName" value={form.firstName} onChange={handleChange} required className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:ring-brand" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Last Name *</span>
                      <input name="lastName" value={form.lastName} onChange={handleChange} required className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:ring-brand" />
                    </label>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Email *</span>
                      <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:ring-brand" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-800">Phone Number</span>
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:ring-brand" />
                    </label>
                  </div>

                  <label className="mt-6 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">I am reaching out about *</span>
                    <select name="topic" value={form.topic} onChange={handleChange} required className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:ring-brand bg-white">
                      <option disabled>Select an option</option>
                      <option>Adoption</option>
                      <option>Fostering</option>
                      <option>Volunteering</option>
                      <option>Donation</option>
                      <option>Other</option>
                    </select>
                  </label>

                  <label className="mt-6 block">
                    <span className="mb-2 block text-sm font-semibold text-slate-800">Message *</span>
                    <textarea name="message" value={form.message} onChange={handleChange} rows={6} required className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-brand focus:ring-brand" />
                  </label>

                  <div className="mt-8 flex justify-center lg:justify-start">
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {status === 'submitting' ? 'Sending...' : 'Send Message'}
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ContactPage;
