import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import PublicPageHeader from '../../components/PublicPageHeader';
import { fetchPublicSettings, submitDonation } from '../../services/publicApi';

const DONATION_TIERS = [
  {
    amount: 10,
    label: 'Feed a Cat',
    icon: (
      <svg viewBox="0 0 40 40" fill="white" className="h-9 w-9">
        <ellipse cx="20" cy="28" rx="11" ry="8" />
        <circle cx="13" cy="14" r="5" />
        <circle cx="20" cy="11" r="5.5" />
        <circle cx="27" cy="14" r="5" />
      </svg>
    ),
  },
  {
    amount: 25,
    label: 'Vaccinations',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9">
        <line x1="12" y1="28" x2="28" y2="12" />
        <line x1="16" y1="24" x2="24" y2="16" />
        <path d="M28 12 L32 8 M8 32 L12 28" />
        <circle cx="20" cy="20" r="5" />
      </svg>
    ),
  },
  {
    amount: 50,
    label: 'Spay/Neuter Support',
    icon: (
      <svg viewBox="0 0 40 40" fill="white" className="h-9 w-9">
        <ellipse cx="20" cy="28" rx="11" ry="8" />
        <circle cx="13" cy="14" r="5" />
        <circle cx="20" cy="11" r="5.5" />
        <circle cx="27" cy="14" r="5" />
        <circle cx="20" cy="20" r="3" fill="white" />
      </svg>
    ),
  },
  {
    amount: 75,
    label: 'Medical Supplies',
    icon: (
      <svg viewBox="0 0 40 40" fill="white" className="h-9 w-9">
        <ellipse cx="20" cy="28" rx="11" ry="8" />
        <circle cx="13" cy="14" r="5" />
        <circle cx="20" cy="11" r="5.5" />
        <circle cx="27" cy="14" r="5" />
      </svg>
    ),
  },
  {
    amount: 100,
    label: 'Emergency Medical Fund',
    icon: (
      <svg viewBox="0 0 40 40" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9">
        <rect x="8" y="10" width="24" height="20" rx="3" />
        <path d="M20 16 v8 M16 20 h8" />
      </svg>
    ),
  },
  {
    amount: 250,
    label: 'Kitten Rescue Package',
    icon: (
      <svg viewBox="0 0 40 40" fill="white" className="h-9 w-9">
        <path d="M20 34 C20 34 8 26 8 17 C8 12 12 8 16.5 8 C18.5 8 20 10 20 10 C20 10 21.5 8 23.5 8 C28 8 32 12 32 17 C32 26 20 34 20 34Z" />
        <ellipse cx="20" cy="21" rx="5" ry="4" fill="rgba(255,255,255,0.3)" />
      </svg>
    ),
  },
];

const OTHER_WAYS = [
  {
    label: 'Venmo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M19.4 3c.4.7.6 1.4.6 2.4 0 3-2.6 6.9-4.7 9.6H10L8.2 3.8l4.5-.4 1 7.7c.9-1.5 2-3.9 2-5.5 0-.9-.2-1.5-.4-2L19.4 3z" />
      </svg>
    ),
  },
  {
    label: 'PayPal',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
      </svg>
    ),
  },
  {
    label: 'Amazon Wishlist',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    label: 'Chewy Wishlist',
    icon: (
      <svg viewBox="0 0 100 100" fill="currentColor" className="h-5 w-5">
        <circle cx="25" cy="30" r="9" />
        <circle cx="43" cy="18" r="10" />
        <circle cx="63" cy="18" r="10" />
        <circle cx="81" cy="32" r="9" />
        <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
      </svg>
    ),
  },
  {
    label: 'Planned Giving',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    ),
  },
  {
    label: 'Corporate Matching',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
];

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
      .catch(() => { });
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
    <div className="bg-white">
      {/* Hero */}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 lg:px-8">
        <h1 className="text-6xl font-extrabold tracking-tight text-brand flex items-center gap-3">
          Donate
          <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
            <circle cx="25" cy="30" r="9" />
            <circle cx="43" cy="18" r="10" />
            <circle cx="63" cy="18" r="10" />
            <circle cx="81" cy="32" r="9" />
            <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
          </svg>
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">Your support helps transform lives.</p>
      </div>

      {/* Main 3-column layout */}
      <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">

          {/* LEFT — Make a Difference Today */}
          <div className="rounded-2xl border border-brand/30 bg-white p-7">
            <h2 className="text-xl font-extrabold leading-snug text-brand">Make a Difference Today</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Your donation helps provide essential care, shelter, and love to cats in need and supports wellness programs for people.
            </p>
            <ul className="mt-5 space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-brand">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                100% of donations go directly to our mission.
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-brand">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Secure and easy giving.
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-brand">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                Donations are tax deductible.
              </li>
            </ul>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-brand">
              <svg viewBox="0 0 100 100" fill="currentColor" className="h-5 w-5">
                <circle cx="25" cy="30" r="9" />
                <circle cx="43" cy="18" r="10" />
                <circle cx="63" cy="18" r="10" />
                <circle cx="81" cy="32" r="9" />
                <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
              </svg>
              EIN: 46-4005576
            </div>
          </div>

          <form onSubmit={handleDonate} className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Choose Your Impact</h2>
            <div className="grid grid-cols-2 gap-3">
              {amounts.map(({ amount, label, desc, featured }) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setSelected(amount)}
                  className={`flex flex-col items-center justify-center rounded-xl p-3 transition-all ${selected === amount
                      ? 'bg-brand ring-2 ring-brand/40'
                      : 'bg-brand/80 hover:bg-brand'
                    }`}
                >
                  <div className="mb-2">{icon}</div>
                  <p className="text-lg font-extrabold text-white">${amount}</p>
                  <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-white/90">{label}</p>
                </button>
              ))}
              {/* Other Amount */}
              <button
                type="button"
                onClick={() => setSelected(0)}
                className={`flex flex-col items-center justify-center rounded-xl p-3 transition-all ${selected === 0
                    ? 'bg-brand ring-2 ring-brand/40'
                    : 'bg-brand/80 hover:bg-brand'
                  }`}
              >
                <svg viewBox="0 0 24 24" fill="white" className="mb-2 h-9 w-9">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <p className="text-sm font-extrabold text-white">Other</p>
                <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-white/90">Amount</p>
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

          {/* RIGHT — Other Ways to Give */}
          <div className="rounded-2xl border border-brand/30 bg-white p-7">
            <h2 className="text-center text-lg font-extrabold leading-snug text-brand">Other Ways to Give</h2>
            <ul className="mt-6 space-y-4">
              {OTHER_WAYS.map((way) => (
                <li key={way.label} className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/5 text-brand">
                    {way.icon}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{way.label}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom kitten image area */}
      <div className="relative bg-white overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative h-80 lg:h-96">

            {/* Hearts — scattered around */}
            {/* Large heart top-left */}
            <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-2 top-4 h-20 w-20 text-brand/40">
              <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
            </svg>
            {/* Small heart near top-left cat */}
            <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="3" className="absolute left-36 top-8 h-10 w-10 text-brand/30">
              <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
            </svg>
            {/* Tiny heart mid-left */}
            <svg viewBox="0 0 60 60" fill="currentColor" className="absolute left-8 top-32 h-7 w-7 text-brand/20">
              <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
            </svg>
            {/* Medium heart top-right area */}
            <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute right-36 top-6 h-14 w-14 text-brand/30">
              <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
            </svg>
            {/* Tiny heart top-right */}
            <svg viewBox="0 0 60 60" fill="currentColor" className="absolute right-8 top-14 h-8 w-8 text-brand/20">
              <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
            </svg>
            {/* Small solid heart bottom-right */}
            <svg viewBox="0 0 60 60" fill="currentColor" className="absolute right-40 bottom-10 h-8 w-8 text-brand/25">
              <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
            </svg>

            {/* LEFT cat — cute.png, bigger */}
            <img
              src="/images/kittens/cute.png"
              alt="Cute rescue kitten"
              className="absolute bottom-0 left-10 h-72 lg:h-80 w-auto object-contain object-bottom"
            />

            {/* RIGHT cat — donate-cat.png, parallel to left */}
            <img
              src="/images/donate-cat.png"
              alt="Playing rescue kitten"
              className="absolute bottom-0 right-10 h-72 lg:h-80 w-auto object-contain object-bottom"
            />

          </div>
        </div>
      </div>
    </div>
  );
}

export default DonatePage;
