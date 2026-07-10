import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import DonationConfirmation from '../../components/DonationConfirmation';
import GivebutterDonationWidget from '../../components/GivebutterDonationWidget';
import { getFileUrl } from '../../services/api';
import { isDonatePageLive } from '../../constants/siteFeatures';
import { fetchPublicSettings } from '../../services/publicApi';
import { markCheckoutSuccessParam } from '../../hooks/useGivebutterCheckout';

const OTHER_WAYS = [
  {
    key: 'venmo',
    label: 'Venmo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M19.4 3c.4.7.6 1.4.6 2.4 0 3-2.6 6.9-4.7 9.6H10L8.2 3.8l4.5-.4 1 7.7c.9-1.5 2-3.9 2-5.5 0-.9-.2-1.5-.4-2L19.4 3z" />
      </svg>
    ),
  },
  {
    key: 'paypal',
    label: 'PayPal',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" />
      </svg>
    ),
  },
  {
    key: 'amazon',
    label: 'Amazon Wishlist',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    key: 'chewy',
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
    key: 'planned',
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
    key: 'corporate',
    label: 'Corporate Matching',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
];

const NINE_LIVES_TIERS = [
  { amount: '$5/mo', name: 'Whisker Watch', desc: 'Small but mighty. Every month adds up to real care.' },
  { amount: '$10/mo', name: 'Bowl Buddy', desc: 'Keeps food and formula flowing for cats and kittens alike.' },
  { amount: '$25/mo', name: 'Shot Sponsor', desc: 'Keeps vaccines and dewormer stocked across the rescue.' },
  { amount: '$50/mo', name: 'Fix Fund', desc: 'Fuels the spay and neuter work that stops the cycle for good.' },
  { amount: '$100/mo', name: 'Colony Champion', desc: 'Powers whole rescues, pull to placement, month after month.' },
  { amount: 'Any amount, every month', name: 'Steady is what saves lives.', desc: null },
];

function PawIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      <circle cx="25" cy="30" r="9" />
      <circle cx="43" cy="18" r="10" />
      <circle cx="63" cy="18" r="10" />
      <circle cx="81" cy="32" r="9" />
      <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
    </svg>
  );
}

function HeartDecoration({ className }) {
  return (
    <svg viewBox="0 0 60 60" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
    </svg>
  );
}

function HeartDecorationSolid({ className }) {
  return (
    <svg viewBox="0 0 60 60" fill="currentColor" className={className}>
      <path d="M30 52 C30 52 6 38 6 20 C6 12 12 6 20 6 C24.5 6 28.5 9 30 12 C31.5 9 35.5 6 40 6 C48 6 54 12 54 20 C54 38 30 52 30 52Z" />
    </svg>
  );
}

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

  const orgEin = settings.orgEin?.trim() && settings.orgEin.trim() !== '[PENDING]'
    ? settings.orgEin.trim()
    : '[PENDING]';

  const otherWayLinks = useMemo(() => {
    const venmoHandle = settings.venmoHandle?.trim();
    const venmoSlug = venmoHandle?.replace(/^@/, '');

    return {
      venmo: venmoSlug ? `https://venmo.com/u/${venmoSlug}` : null,
      paypal: settings.paypalLink?.trim() || null,
      amazon: settings.amazonWishlistUrl?.trim() || null,
      chewy: settings.chewyWishlistUrl?.trim() || null,
      planned: '/contact',
      corporate: '/contact',
    };
  }, [settings]);

  if (!isDonatePageLive(settings)) {
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
          <PawIcon className="h-11 w-11 text-brand" />
        </h1>
        <p className="mt-2 text-lg font-medium text-slate-600">
          Every dollar goes to work for a cat who ran out of options.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-12 lg:px-8">
        {donationComplete ? (
          <DonationConfirmation variant="donation" className="mb-8" />
        ) : null}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-brand/30 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-extrabold leading-snug text-brand">Make a Difference Today</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Your donation funds rescue pulls, vet care, vaccines, spay and neuter surgeries, and the foster network that gets at-risk cats from crisis to couch.
            </p>
            <ul className="mt-5 space-y-3">
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-brand">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                Every donation goes to work for the cats.
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-brand">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secure and easy giving.
              </li>
            </ul>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-brand">
              <PawIcon />
              EIN: {orgEin}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
            <h2 className="text-xl font-bold text-slate-900">One-Time Gift</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Give once, give any amount. Every dollar goes straight to the cats who need it most: a vet bill, a litter of bottle babies, an empty foster pantry.
            </p>
            <p className="mt-4 text-xs font-medium text-slate-500">
              Suggested quick amounts: $25 · $50 · $100 · Other
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Donations support the rescue wherever the need is greatest.
            </p>
            <p className="mt-4 text-xs italic text-slate-500">
              Note: the named tiers (Kickstart Kitty, Shots &amp; Chips, and so on) live on the individual kitten sponsor pages, not here. This page is general one-time and recurring giving.
            </p>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
              <GivebutterDonationWidget
                code={settings.donationWidgetCode}
                amount={prefilledAmount || undefined}
                onSuccess={handleDonationSuccess}
                className="min-h-[420px] w-full"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-brand/30 bg-white p-7 shadow-sm">
            <h2 className="text-center text-lg font-extrabold leading-snug text-brand">Other Ways to Give</h2>
            <ul className="mt-6 space-y-4">
              {OTHER_WAYS.map((way) => {
                const href = otherWayLinks[way.key];
                const isExternal = href?.startsWith('http');

                const content = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/5 text-brand">
                      {way.icon}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{way.label}</span>
                  </>
                );

                if (href) {
                  return (
                    <li key={way.key}>
                      {isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-4 rounded-lg transition hover:bg-brand/5"
                        >
                          {content}
                        </a>
                      ) : (
                        <Link to={href} className="flex items-center gap-4 rounded-lg transition hover:bg-brand/5">
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={way.key} className="flex items-center gap-4">
                    {content}
                  </li>
                );
              })}
            </ul>

            {settings.venmoQrCodeUrl ? (
              <div className="mt-6 flex flex-col items-center border-t border-slate-100 pt-6">
                <img
                  src={getFileUrl(settings.venmoQrCodeUrl)}
                  alt="Venmo QR code"
                  className="h-32 w-32 rounded-xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
                />
                {settings.venmoHandle ? (
                  <p className="mt-3 text-xs font-semibold text-slate-600">{settings.venmoHandle}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-brand/20 bg-brand-light/10 p-6 shadow-sm lg:p-8">
          <h2 className="text-xl font-extrabold text-brand">Join the Nine Lives Club</h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600">
            Join the Nine Lives Club with a monthly gift. It&apos;s the most powerful thing you can do for these cats: it turns one-time generosity into something we can count on, which means we can say yes to the next cat before the crisis, not after.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {NINE_LIVES_TIERS.map((tier) => (
              <li
                key={tier.name}
                className="rounded-xl border border-brand/15 bg-white px-4 py-3 text-sm text-slate-600"
              >
                <span className="font-semibold text-slate-800">{tier.amount}</span>
                {tier.desc ? (
                  <>
                    {' '}
                    · {tier.name} · {tier.desc}
                  </>
                ) : (
                  <> · {tier.name}</>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-600">
            Cancel anytime, no questions. We&apos;ll keep you posted on exactly who your giving helped.
          </p>
        </section>
      </div>

      <div className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative h-80 lg:h-96">
            <HeartDecoration className="absolute left-2 top-4 h-20 w-20 text-brand/40" />
            <HeartDecoration className="absolute left-36 top-8 h-10 w-10 text-brand/30" />
            <HeartDecorationSolid className="absolute left-8 top-32 h-7 w-7 text-brand/20" />
            <HeartDecoration className="absolute right-36 top-6 h-14 w-14 text-brand/30" />
            <HeartDecorationSolid className="absolute right-8 top-14 h-8 w-8 text-brand/20" />
            <HeartDecorationSolid className="absolute bottom-10 right-40 h-8 w-8 text-brand/25" />

            <img
              src="/images/kittens/cute.png"
              alt="Cute rescue kitten"
              className="absolute bottom-0 left-10 h-72 w-auto object-contain object-bottom lg:h-80"
            />
            <img
              src="/images/donate-cat.png"
              alt="Playing rescue kitten"
              className="absolute bottom-0 right-10 hidden h-72 w-auto object-contain object-bottom lg:block lg:h-80"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DonatePage;
