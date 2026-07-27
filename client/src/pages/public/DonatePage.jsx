import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import DonationConfirmation from '../../components/DonationConfirmation';
import GivebutterDonationWidget from '../../components/GivebutterDonationWidget';
import SecureWidget from '../../components/SecureWidget';
import { isDonatePageLive } from '../../constants/siteFeatures';
import {
  fetchPublicSettings,
  fetchPublicWishlists,
  invalidatePublicSettingsCache,
} from '../../services/publicApi';
import { DONATE_PAGE_EIN } from '../../constants/siteCopy';
import {
  DEFAULT_GIVEBUTTER_DONATE_URL,
  DEFAULT_GIVEBUTTER_NINE_LIVES_URL,
} from '../../constants/givebutterDefaults';
import { markCheckoutSuccessParam } from '../../hooks/useGivebutterCheckout';
import { WISHLIST_OWNER_TYPES, WISHLIST_RETAILERS } from '../../constants/wishlists';

const PAYPAL_DONATE_EMBED = `<form action="https://www.paypal.com/donate" method="post" target="_top">
<input type="hidden" name="hosted_button_id" value="2D7222ATY9EDQ" />
<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
<img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
</form>`;

const OTHER_WAYS = [
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

function VenmoIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
      <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">V</text>
    </svg>
  );
}

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
  const [orgWishlists, setOrgWishlists] = useState([]);
  const [donationComplete, setDonationComplete] = useState(false);

  const prefilledAmount = searchParams.get('amount') || '';

  useEffect(() => {
    invalidatePublicSettingsCache();
    fetchPublicSettings()
      .then(setSettings)
      .catch(() => {});
    fetchPublicWishlists(WISHLIST_OWNER_TYPES.ORG, 1)
      .then((data) => setOrgWishlists(Array.isArray(data) ? data : []))
      .catch(() => setOrgWishlists([]));
  }, []);

  const handleDonationSuccess = useCallback(() => {
    setDonationComplete(true);
    markCheckoutSuccessParam('donation');
  }, []);

  const orgEin = DONATE_PAGE_EIN;

  const otherWayLinks = useMemo(() => {
    const amazonFromWishlist = orgWishlists.find((w) => w.retailer === WISHLIST_RETAILERS.AMAZON)?.url?.trim();
    const chewyFromWishlist = orgWishlists.find((w) => w.retailer === WISHLIST_RETAILERS.CHEWY)?.url?.trim();
    return {
      amazon: amazonFromWishlist || settings.amazonWishlistUrl?.trim() || null,
      chewy: chewyFromWishlist || settings.chewyWishlistUrl?.trim() || null,
      planned: '/contact',
      corporate: '/contact',
    };
  }, [settings, orgWishlists]);

  // Venmo has no embeddable donate button (unlike PayPal/Givebutter) - the
  // standard approach is a profile link plus an optional QR code for the
  // Venmo app's scan-to-pay flow. venmoHandle/venmoQrCodeUrl already exist
  // as Settings fields (Admin -> Settings -> Organization) and are already
  // exposed on the public settings payload; this just surfaces them.
  const venmoUsername = settings.venmoHandle?.trim().replace(/^@+/, '') || '';
  const venmoQrCodeUrl = settings.venmoQrCodeUrl?.trim() || '';

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
            <a href="/whyfoster" className="font-semibold text-brand hover:underline">Become a Foster</a>
            {' '}or{' '}
            <a href="/available" className="font-semibold text-brand hover:underline">Meet the Cats</a>.
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
              General one-time and recurring giving for the rescue. Kitten sponsorship lives on each cat&apos;s Meet Me page.
            </p>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50">
              <GivebutterDonationWidget
                amount={prefilledAmount || undefined}
                fallbackUrl={DEFAULT_GIVEBUTTER_DONATE_URL}
                buttonLabel="Donate securely"
                onSuccess={handleDonationSuccess}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-brand/30 bg-white p-7 shadow-sm">
            <h2 className="text-center text-lg font-extrabold leading-snug text-brand">Other Ways to Give</h2>

            {(PAYPAL_DONATE_EMBED || venmoUsername) && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Give Directly</h3>
                <div className="mt-3 space-y-4">
                  {PAYPAL_DONATE_EMBED ? (
                    <div className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                      <SecureWidget code={PAYPAL_DONATE_EMBED} />
                    </div>
                  ) : null}

                  {venmoUsername ? (
                    <a
                      href={`https://venmo.com/u/${venmoUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-4 rounded-lg border border-slate-100 p-3 transition hover:bg-brand/5"
                    >
                      {venmoQrCodeUrl ? (
                        <img
                          src={venmoQrCodeUrl}
                          alt="Venmo QR code"
                          className="h-14 w-14 shrink-0 rounded-md border border-slate-200 bg-white object-contain p-1"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/5 text-brand">
                          <VenmoIcon />
                        </span>
                      )}
                      <span>
                        <span className="block text-sm font-semibold text-slate-700">Venmo</span>
                        <span className="block text-xs text-slate-500">@{venmoUsername}</span>
                      </span>
                    </a>
                  ) : null}
                </div>

                <div className="mt-6 border-t border-slate-100" />
              </div>
            )}

            <ul className="mt-6 space-y-4">
              {OTHER_WAYS.map((way) => {
                const href = otherWayLinks[way.key];
                const isExternal = href?.startsWith('http');
                const isWishlist = way.key === 'amazon' || way.key === 'chewy';

                const content = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand/20 bg-brand/5 text-brand">
                      {way.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-700">{way.label}</span>
                      {isWishlist && !href ? (
                        <span className="block text-xs text-slate-400">Link coming soon</span>
                      ) : null}
                    </span>
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
                  <li
                    key={way.key}
                    className={`flex items-center gap-4 ${isWishlist ? 'cursor-not-allowed opacity-60' : ''}`}
                    aria-disabled={isWishlist || undefined}
                  >
                    {content}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-brand/20 bg-brand-light/10 p-6 shadow-sm lg:p-8">
          <h2 className="text-xl font-extrabold text-brand">Join the Nine Lives Club</h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600">
            Join the Nine Lives Club with a monthly gift. It&apos;s the most powerful thing you can do for these cats: it turns one-time generosity into something we can count on, which means we can say yes to the next cat before the crisis, not after.
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
            <GivebutterDonationWidget
              frequency="monthly"
              fallbackUrl={DEFAULT_GIVEBUTTER_NINE_LIVES_URL}
              buttonLabel="Join the Nine Lives Club"
              onSuccess={handleDonationSuccess}
            />
          </div>
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
