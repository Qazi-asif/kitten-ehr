import { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';

function ContactPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    topic: 'Select an option',
    message: '',
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    window.location.href = `mailto:david@pawsitivetransfomations.org?subject=${encodeURIComponent(form.topic)}&body=${encodeURIComponent(form.message)}`;
  }

  return (
    <div className="bg-white">
      {/* Hero */}
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
          
          {/* Left Column: Info Card + Kitten */}
          <div className="lg:w-1/3 flex flex-col relative">
            {/* Contact Info Card */}
            <div className="rounded-2xl border border-brand/40 bg-white p-7 relative z-10">
              <h2 className="text-xl font-bold text-brand">Contact Information</h2>
              
              <ul className="mt-8 space-y-6">
                <li className="flex items-start gap-4">
                  <Phone fill="currentColor" stroke="none" className="mt-1 h-6 w-6 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-brand">Call / Text</p>
                    <p className="font-semibold text-slate-800">(951) 951-830-1825</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Mail fill="currentColor" stroke="none" className="mt-1 h-6 w-6 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-brand">Email</p>
                    <p className="font-semibold text-slate-800">david@pawsitivetransfomations.org</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <MapPin fill="currentColor" stroke="none" className="mt-1 h-6 w-6 shrink-0 text-brand" />
                  <div>
                    <p className="text-sm font-medium text-brand">Address</p>
                    <div className="font-semibold text-slate-800 leading-snug">
                      <p>12523 Limonite, Suite 440412</p>
                      <p>Mira Loma, CA 91752</p>
                      <p>Riverside County</p>
                    </div>
                  </div>
                </li>
              </ul>
              
              <div className="mt-10 pt-4 font-semibold text-slate-800">
                EIN: 46-4805576
              </div>
            </div>

            {/* Cat and Heart Image Container */}
            <div className="relative mt-auto pt-8 flex items-end">
              <img 
                src="/images/contact-kitten.png" 
                alt="Cat" 
                className="w-full xl:w-11/12 object-contain object-bottom -mb-2 z-10" 
              />
              <div className="absolute right-0 bottom-12 w-1/4">
                 <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" className="w-full h-auto text-brand" style={{ transform: 'rotate(15deg)' }}>
                   <path d="M50 85 C50 85 10 60 10 35 C10 20 25 10 35 25 C45 10 60 20 60 35 C60 60 50 85 50 85 Z" strokeLinecap="round" strokeLinejoin="round" />
                   <path d="M50 85 C60 80 80 65 90 40" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
              </div>
            </div>
          </div>

          {/* Right Column: Form Card */}
          <div className="lg:w-2/3 pb-16">
            <div className="rounded-2xl border border-brand/40 bg-white p-7 lg:p-10 h-full">
              <h2 className="text-2xl font-bold text-brand">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="mt-8">
                
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
                  <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-brand px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors">
                    Send Message
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                
              </form>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
