import { useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';

function ContactPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    topic: 'Adoption',
    message: '',
  });

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    window.location.href = `mailto:hello@pawsitivetransformations.org?subject=${encodeURIComponent(form.topic)}&body=${encodeURIComponent(form.message)}`;
  }

  return (
    <div>
      <section className="border-b border-gray-200 bg-white px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-2 text-gray-600">We&apos;d love to hear from you about adoption, fostering, or volunteering.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <div>
            <img src="/images/kittens/gravy.jpg" alt="Cat" className="w-full rounded-xl object-cover shadow-md" />
            <h2 className="mt-8 text-lg font-bold text-gray-900">Contact Information</h2>
            <ul className="mt-6 space-y-5">
              <li className="flex items-start gap-4">
                <Phone className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Phone / Text</p>
                  <p className="text-sm text-gray-600">(555) 123-4567</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Mail className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Email</p>
                  <p className="text-sm text-gray-600">hello@pawsitivetransformations.org</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <MapPin className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Address</p>
                  <p className="text-sm text-gray-600">123 Rescue Lane, Greater Metro Area</p>
                </div>
              </li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Send Us a Message</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">First Name</span>
                <input name="firstName" value={form.firstName} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-700">Last Name</span>
                <input name="lastName" value={form.lastName} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Email</span>
              <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Phone Number</span>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-gray-700">I am reaching out about</span>
              <select name="topic" value={form.topic} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option>Adoption</option>
                <option>Fostering</option>
                <option>Volunteering</option>
                <option>Donation</option>
                <option>Other</option>
              </select>
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-gray-700">Message</span>
              <textarea name="message" value={form.message} onChange={handleChange} rows={4} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <button type="submit" className="mt-6 w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
