import { useEffect, useState, useCallback } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import DonationConfirmation from '../../components/DonationConfirmation';
import GivebutterDonationWidget from '../../components/GivebutterDonationWidget';
import { getFileUrl } from '../../services/api';
import { DONATE_PAGE_LIVE } from '../../constants/siteFeatures';
import { fetchPublicSettings } from '../../services/publicApi';
import { markCheckoutSuccessParam } from '../../hooks/useGivebutterCheckout';

function DonatePage() {
  const outlet = useOutletContext();
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(outlet?.settings ?? {});
  const [donationComplete, setDonationComplete] = useState(false);

  const prefilledAmount = searchParams.get('amount') || '';

  useEffect(() => {
    fetchPublicSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleDonationSuccess = useCallback(() => {
    setDonationComplete(true);
    markCheckoutSuccessParam('donation');
  }, []);

  const hasStripe = Boolean(settings.stripeLink);
  const hasPaypal = Boolean(settings.paypalLink);
  const hasVenmo = Boolean(settings.venmoQrCodeUrl);
  const orgEin = settings.orgEin?.trim() && settings.orgEin.trim() !== '[PENDING]'
    ? settings.orgEin.trim()
    : '[PENDING]';

  if (!DONATE_PAGE_LIVE) {
    return (
      <div className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center lg:px-8">
          <h1 className="text-4xl font-extrabold text-brand">Donate</h1>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            Online giving is coming soon. We&apos;re completing our California charitable registration and will open donations once that process is finished. Thank you for your patience and your heart for these cats.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Want to foster or adopt in the meantime?{' '}
            <a href="/get-involved" className="font-semibold text-brand hover:underline">Become a Foster</a>
            {' '}or{' '}
            <a href="/kittens" className="font-semibold text-brand hover:underline">Meet the Cats</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-6 lg:px-8">
        <h1 className="flex items-center gap-3 text-6xl font-extrabold tracking-tight text-brand">
          Donate
          <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
            <circle cx="25" cy="30" r="9" />
            <circle cx="43" cy="18" r="10" />
            <circle cx="63" cy="18" r="10" />
            <circle cx="81" cy="32" r="9" />
            <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
          </svg>
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">
          Every dollar goes to work for a cat who ran out of options.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        {donationComplete ? (
          <DonationConfirmation variant="donation" className="mb-12" />
        ) : null}

        <div className="mb-8 rounded-2xl border border-brand/25 bg-brand-light/20 p-6 lg:p-8">
          <h2 className="text-xl font-extrabold text-brand">Make a Difference Today</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Your donation funds rescue pulls, vet care, vaccines, spay and neuter surgeries, and the foster network that gets at-risk cats from crisis to couch.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Every donation goes to work for the cats.</li>
            <li>Secure and easy giving.</li>
          </ul>
          <p className="mt-4 text-sm font-semibold text-slate-700">EIN: {orgEin}</p>
        </div>

        <section className="mb-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <h2 className="text-xl font-bold text-slate-900">One-Time Gift</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Give once, give any amount. Every dollar goes straight to the cats who need it most: a vet bill, a litter of bottle babies, an empty foster pantry.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Suggested quick amounts: $25 · $50 · $100 · Other
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Donations support the rescue wherever the need is greatest.
          </p>

          <div className="mt-6 overflow-hidden">
            <GivebutterDonationWidget
              code={settings.donationWidgetCode}
              amount={prefilledAmount || undefined}
              onSuccess={handleDonationSuccess}
              className="min-h-[420px] w-full"
            />
          </div>
        </section>

        <section className="mb-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <h2 className="text-xl font-bold text-slate-900">Join the Nine Lives Club</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Join the Nine Lives Club with a monthly gift. It&apos;s the most powerful thing you can do for these cats: it turns one-time generosity into something we can count on, which means we can say yes to the next cat before the crisis, not after.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            <li><span className="font-semibold text-slate-800">$5/mo</span> · Whisker Watch · Small but mighty. Every month adds up to real care.</li>
            <li><span className="font-semibold text-slate-800">$10/mo</span> · Bowl Buddy · Keeps food and formula flowing for cats and kittens alike.</li>
            <li><span className="font-semibold text-slate-800">$25/mo</span> · Shot Sponsor · Keeps vaccines and dewormer stocked across the rescue.</li>
            <li><span className="font-semibold text-slate-800">$50/mo</span> · Fix Fund · Fuels the spay and neuter work that stops the cycle for good.</li>
            <li><span className="font-semibold text-slate-800">$100/mo</span> · Colony Champion · Powers whole rescues, pull to placement, month after month.</li>
            <li><span className="font-semibold text-slate-800">Any amount, every month</span> · Steady is what saves lives.</li>
          </ul>
          <p className="mt-6 text-sm text-slate-600">
            Cancel anytime, no questions. We&apos;ll keep you posted on exactly who your giving helped.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-center text-2xl font-bold text-slate-900">Other Ways to Give</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">
            Venmo · PayPal · Amazon Wishlist · Chewy Wishlist · Planned Giving · Corporate Matching
          </p>

          {(hasStripe || hasPaypal || hasVenmo) && (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {hasStripe ? (
                <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">Stripe</h3>
                  <a
                    href={settings.stripeLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    Donate Now
                  </a>
                </article>
              ) : null}

              {hasPaypal ? (
                <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">PayPal</h3>
                  <a
                    href={settings.paypalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#0070BA] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#005ea6]"
                  >
                    Donate Now
                  </a>
                </article>
              ) : null}

              {hasVenmo ? (
                <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">Venmo</h3>
                  <img
                    src={getFileUrl(settings.venmoQrCodeUrl)}
                    alt="Venmo QR code"
                    className="mt-5 h-40 w-40 rounded-xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
                  />
                  {settings.venmoHandle ? (
                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      {settings.venmoHandle}
                    </p>
                  ) : null}
                </article>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DonatePage;
