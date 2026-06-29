import { useState } from 'react';
import PublicPageHeader from '../../components/PublicPageHeader';

const AMOUNTS = [
  { amount: 10, label: 'Feed a Cat', desc: 'One week of meals' },
  { amount: 25, label: 'Litter & Supplies', desc: 'Essentials for foster homes' },
  { amount: 50, label: 'Vaccines', desc: 'Core vaccines for one kitten' },
  { amount: 75, label: 'Medical Care', desc: 'Exam and treatment fund' },
  { amount: 100, label: 'Spay/Neuter', desc: 'Surgery for one kitten' },
  { amount: 250, label: 'Full Rescue', desc: 'Complete intake for one kitten' },
];

const OTHER_WAYS = [
  { label: 'Venmo', detail: '@PawsitiveTransform' },
  { label: 'PayPal', detail: 'hello@pawsitivetransformations.org' },
  { label: 'Amazon Wishlist', detail: 'Shop our supply list' },
  { label: 'Chewy Wishlist', detail: 'Food & formula donations' },
];

function DonatePage() {
  const [selected, setSelected] = useState(50);

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
              Pawsitive Transformations is a 501(c)(3) nonprofit. Your donation is tax-deductible.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Choose Your Impact</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {AMOUNTS.map(({ amount, label, desc }) => (
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
                  <p className="text-xs font-semibold text-slate-800">{label}</p>
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
            <a
              href="https://buy.stripe.com/test_placeholder"
              target="_blank"
              rel="noreferrer"
              className="mt-6 block w-full rounded-md bg-brand py-3.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Donate Now{selected > 0 ? ` — $${selected}` : ''}
            </a>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Other Ways to Give</h2>
            <ul className="mt-4 space-y-4">
              {OTHER_WAYS.map((way) => (
                <li key={way.label} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand">
                    {way.label[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{way.label}</p>
                    <p className="text-xs text-slate-500">{way.detail}</p>
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
