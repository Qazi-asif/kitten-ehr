import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PublicPageHeader from '../../components/PublicPageHeader';
import { fetchPublicSettings, submitDonation } from '../../services/publicApi';

const BASE_AMOUNTS = [10, 25, 50, 75, 100, 250];

const AMOUNT_LABELS = {
  10: { label: 'Feed a Cat', desc: 'One week of meals' },
  25: { label: 'Litter & Supplies', desc: 'Essentials for foster homes' },
  50: { label: 'Vaccines', desc: 'Core vaccines for one kitten' },
  75: { label: 'Medical Care', desc: 'Exam and treatment fund' },
  100: { label: 'Spay/Neuter', desc: 'Surgery for one kitten' },
  250: { label: 'Full Rescue', desc: 'Complete intake for one kitten' },
};

function DonatePage() {
  const outlet = useOutletContext();
  const [settings, setSettings] = useState(outlet?.settings ?? { defaultDonationAmount: 50 });
  const [selected, setSelected] = useState(settings.defaultDonationAmount || 50);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPublicSettings()
      .then((data) => {
        setSettings(data);
        setSelected(data.defaultDonationAmount || 50);
      })
      .catch(() => {});
  }, []);

  const amounts = useMemo(() => {
    const defaultAmount = settings.defaultDonationAmount || 50;
    const values = BASE_AMOUNTS.includes(defaultAmount)
      ? BASE_AMOUNTS
      : [...BASE_AMOUNTS, defaultAmount].sort((a, b) => a - b);

    return values.map((amount) => ({
      amount,
      label: AMOUNT_LABELS[amount]?.label || 'Suggested Gift',
      desc: AMOUNT_LABELS[amount]?.desc || 'Support our rescue mission',
      featured: amount === defaultAmount,
    }));
  }, [settings.defaultDonationAmount]);

  const donationAmount = selected === 0 ? Number.parseFloat(customAmount) : selected;

  const otherWays = [
    { label: 'Venmo', detail: '@PawsitiveTransform', href: null },
    { label: 'PayPal', detail: 'hello@pawsitivetransformations.org', href: null },
    {
      label: 'Amazon Wishlist',
      detail: settings.amazonWishlistUrl ? 'Shop our supply list' : 'Link coming soon',
      href: settings.amazonWishlistUrl || null,
    },
    {
      label: 'Chewy Wishlist',
      detail: settings.chewyWishlistUrl ? 'Food & formula donations' : 'Link coming soon',
      href: settings.chewyWishlistUrl || null,
    },
  ];

  async function handleDonate(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!donorName.trim() || !donorEmail.trim()) {
      setError('Please enter your name and email.');
      return;
    }
    if (!donationAmount || donationAmount <= 0) {
      setError('Please choose or enter a valid donation amount.');
      return;
    }

    setSubmitting(true);
    try {
      await submitDonation({
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        amount: donationAmount,
        message: message.trim(),
      });
      setSuccess('Thank you for your donation! A confirmation email will be sent if email delivery is enabled.');
      setDonorName('');
      setDonorEmail('');
      setMessage('');
      setCustomAmount('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PublicPageHeader
        title="Donate"
        subtitle="Your generosity directly supports rescue, medical care, and foster supplies."
        showPaw={false}
      />

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Make a Difference Today</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Every dollar helps us rescue kittens, provide round-the-clock bottle feeding, cover vet bills, and place cats in loving forever homes.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {settings.orgName || 'Pawsitive Transformations'} is a 501(c)(3) nonprofit. Your donation is tax-deductible.
            </p>
          </div>

          <form onSubmit={handleDonate} className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Choose Your Impact</h2>
            <div className="grid grid-cols-2 gap-3">
              {amounts.map(({ amount, label, desc, featured }) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setSelected(amount)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selected === amount
                      ? 'border-brand bg-brand-light ring-2 ring-brand/30'
                      : 'border-slate-200 bg-white hover:border-brand/40'
                  }`}
                >
                  <p className="text-lg font-bold text-brand">${amount}</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {label}
                    {featured ? ' · Suggested' : ''}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">{desc}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelected(0)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selected === 0
                    ? 'border-brand bg-brand-light ring-2 ring-brand/30'
                    : 'border-slate-200 bg-white hover:border-brand/40'
                }`}
              >
                <p className="text-lg font-bold text-brand">Other</p>
                <p className="text-xs text-slate-500">Custom amount</p>
              </button>
            </div>

            {selected === 0 && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Custom Amount ($)</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Your Name</span>
              <input
                required
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
              <input
                type="email"
                required
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Message (optional)</span>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-700">{success}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-brand py-3.5 text-center text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? 'Processing...' : `Donate Now${donationAmount > 0 ? ` — $${donationAmount}` : ''}`}
            </button>
          </form>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Other Ways to Give</h2>
            <ul className="mt-4 space-y-4">
              {otherWays.map((way) => (
                <li key={way.label} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand">
                    {way.label[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{way.label}</p>
                    {way.href ? (
                      <a href={way.href} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
                        {way.detail}
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500">{way.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section className="border-t border-slate-100 bg-brand-light/40 py-10">
        <div className="mx-auto flex max-w-4xl justify-center px-6">
          <img src="/images/kittens/nugget.jpg" alt="Kitten" className="max-h-48 rounded-2xl object-cover shadow-lg" />
        </div>
      </section>
    </div>
  );
}

export default DonatePage;
