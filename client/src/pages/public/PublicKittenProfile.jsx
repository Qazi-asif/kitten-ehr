import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, PawPrint, ShoppingBag, Sparkles } from 'lucide-react';
import { DONATE_PAGE_LIVE } from '../../constants/siteFeatures';
import { WISHLIST_OWNER_TYPES, WISHLIST_RETAILER_META } from '../../constants/wishlists';
import DonationCheckoutPanel from '../../components/DonationCheckoutPanel';
import DonationConfirmation from '../../components/DonationConfirmation';
import { fetchPublicKittenById, fetchPublicKittenUpdates, fetchPublicSettings, fetchPublicWishlists } from '../../services/publicApi';
import { markCheckoutSuccessParam } from '../../hooks/useGivebutterCheckout';
import KittenPhoto from '../../components/KittenPhoto';
import { formatKittenAgeDetailed } from '../../utils/kittenAge';

const SPONSOR_TIERS = [
  {
    id: 'kickstart',
    name: 'Kickstart Kitty',
    price: 15,
    description: 'A vaccine, a dewormer, or a week of formula',
  },
  {
    id: 'shots',
    name: 'Shots & Chips',
    price: 40,
    description: 'Full vaccine set plus a microchip',
  },
  {
    id: 'belly',
    name: 'Belly & Box',
    price: 75,
    description: 'A month of food, litter, and flea prevention',
  },
  {
    id: 'fix',
    name: 'The Big Fix',
    price: 135,
    getDescription: (name) => `Covers ${name}'s spay or neuter surgery`,
  },
  {
    id: 'caboodle',
    name: 'Whole Kitten Caboodle',
    price: 350,
    getDescription: (name) => `Everything, pull to placement. Your name on ${name}'s page.`,
  },
];

function tierDescription(tier, kittenName) {
  if (tier.getDescription) return tier.getDescription(kittenName);
  return tier.description;
}

function extractImagesFromContent(content = '') {
  const dataImages = content.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g) || [];
  const urlImages = content.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi) || [];
  return [...new Set([...dataImages, ...urlImages])];
}

function stripImagesFromContent(content = '') {
  return content
    .replace(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/g, '')
    .replace(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatUpdateDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PublicKittenProfile() {
  const { id } = useParams();
  const sponsorRef = useRef(null);
  const wishlistRef = useRef(null);
  const [kitten, setKitten] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTierId, setSelectedTierId] = useState(SPONSOR_TIERS[0].id);
  const [customAmount, setCustomAmount] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [sponsorshipComplete, setSponsorshipComplete] = useState(false);
  const [donationWidgetCode, setDonationWidgetCode] = useState('');

  useEffect(() => {
    Promise.all([
      fetchPublicKittenById(id),
      fetchPublicKittenUpdates(id),
      fetchPublicWishlists(WISHLIST_OWNER_TYPES.KITTEN, id),
      fetchPublicSettings(),
    ])
      .then(([kittenData, updateData, wishlistData, settingsData]) => {
        setKitten(kittenData);
        setUpdates(updateData);
        setWishlists(Array.isArray(wishlistData) ? wishlistData : []);
        setDonationWidgetCode(settingsData?.donationWidgetCode || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSponsorshipSuccess = useCallback(() => {
    setSponsorshipComplete(true);
    setShowCheckout(false);
    markCheckoutSuccessParam('sponsor');
  }, []);

  function scrollToRef(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gradient-to-b from-brand-light/40 to-white text-slate-500">
        Loading profile...
      </div>
    );
  }

  if (error) return <div className="px-6 py-12 text-red-600">{error}</div>;

  const selectedTier = SPONSOR_TIERS.find((tier) => tier.id === selectedTierId) || SPONSOR_TIERS[0];
  const sponsorAmount = customAmount.trim() || String(selectedTier.price);

  const infoPills = [
    { label: 'Age', value: formatKittenAgeDetailed(kitten.dateOfBirth) },
    { label: 'Sex', value: kitten.sex || 'Unknown' },
    { label: 'Breed', value: kitten.breed || 'Mixed' },
    { label: 'Fixed Status', value: kitten.fixedStatus || 'Pending' },
  ];

  const complianceText = `Sponsorships help cover ${kitten.name}'s care. Once ${kitten.name} is fully funded or finds a home, additional gifts support kittens just like them. Pawsitive Transformations directs all sponsorship funds where the cats need them most.`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-light/25 via-white to-slate-50">
      {/* Cover photo banner */}
      <div className="relative h-56 w-full overflow-hidden bg-slate-200 sm:h-72 md:h-80 lg:h-96">
        <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      {/* Profile header — Facebook-style identity bar */}
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg ring-2 ring-brand/20 sm:h-32 sm:w-32">
              <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
            </div>
            <div className="pb-1">
              <Link to="/kittens" className="text-xs font-semibold text-brand hover:underline">
                ← Back to Adopt
              </Link>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {kitten.name}
              </h1>
              {kitten.websiteFeaturedComment ? (
                <p className="mt-1 max-w-xl text-sm font-medium text-slate-600 sm:text-base">
                  {kitten.websiteFeaturedComment}
                </p>
              ) : (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Sparkles className="h-4 w-4 text-brand" />
                  Looking for a forever home
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-1 sm:justify-end">
            <Link
              to={`/adopt?kitten=${encodeURIComponent(kitten.name)}`}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Adopt Me
            </Link>
            <button
              type="button"
              onClick={() => scrollToRef(sponsorRef)}
              className={`rounded-xl border-2 border-brand bg-white px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand-light ${!DONATE_PAGE_LIVE ? 'hidden' : ''}`}
            >
              Sponsor Me
            </button>
            <button
              type="button"
              onClick={() => scrollToRef(wishlistRef)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ShoppingBag className="h-4 w-4" />
              Wishlist
            </button>
          </div>
        </div>
      </div>

      {/* Main social feed layout */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:gap-8 lg:px-8">
        {/* Left — About + Wishlist */}
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-brand-light/60 to-white px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <PawPrint className="h-5 w-5 text-brand" />
                About Me
              </h2>
            </div>
            <div className="px-5 py-5">
              <p className="text-base leading-relaxed text-slate-700">
                {kitten.rescueStory
                  || `${kitten.name} is full of personality and ready to meet their person. Every rescue has a story, and ${kitten.name}'s is still being written with love in foster care.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {infoPills.map((pill) => (
                  <span
                    key={pill.label}
                    className="inline-flex items-center rounded-full border border-brand/25 bg-brand-light/40 px-3.5 py-1.5 text-xs font-bold text-brand"
                  >
                    {pill.label}: {pill.value}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section
            ref={wishlistRef}
            id="wishlist"
            className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Wishlist</h2>
            </div>
            <div className="px-5 py-5">
              {wishlists.length > 0 ? (
                <>
                  <p className="text-sm text-slate-600">
                    Send supplies directly to support {kitten.name}&apos;s care through these store wishlists.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {wishlists.map((item) => {
                      const meta = WISHLIST_RETAILER_META[item.retailer] || {};
                      return (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex flex-col rounded-xl border p-4 text-center transition-colors ${meta.buttonClass || 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}
                        >
                          <span className="text-sm font-bold">{item.label || meta.label || item.retailer}</span>
                          <span className="mt-1 text-xs opacity-80">{meta.description || 'Shop wishlist supplies'}</span>
                        </a>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Wishlist links for {kitten.name} are coming soon.{' '}
                  <Link to="/donate" className="font-semibold text-brand hover:underline">
                    Visit our donation page
                  </Link>{' '}
                  to support their care today.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right — Recent Updates timeline */}
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:sticky lg:top-24">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">Recent Updates</h2>
              <p className="mt-0.5 text-xs text-slate-500">News from foster care</p>
            </div>
            <div className="max-h-[32rem] overflow-y-auto px-4 py-4">
              {updates.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-slate-500">
                  No public updates yet. Check back soon!
                </p>
              ) : (
                <ol className="space-y-4">
                  {updates.map((entry) => {
                    const images = extractImagesFromContent(entry.content);
                    const text = stripImagesFromContent(entry.content);
                    return (
                      <li
                        key={entry.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm">
                            <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900">{kitten.name}</p>
                            <time className="text-xs font-medium text-slate-500">
                              {formatUpdateDate(entry.createdAt)}
                            </time>
                            {text && (
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">{text}</p>
                            )}
                            {images.length > 0 && (
                              <div className={`mt-3 grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {images.map((src) => (
                                  <img
                                    key={src.slice(0, 48)}
                                    src={src}
                                    alt=""
                                    className="w-full rounded-lg border border-slate-200 object-cover"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Sponsorship section */}
      {DONATE_PAGE_LIVE && (
      <section
        ref={sponsorRef}
        id="sponsor"
        className="scroll-mt-24 border-t border-brand/15 bg-gradient-to-b from-white to-brand-light/20 px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Sponsor {kitten.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                Every kitten we rescue needs food, shots, a surgery, and a whole lot of care before they find their person. Sponsoring {kitten.name} covers the real cost of getting them there safely. Pick a tier below, or chip in any amount. You&apos;ll be part of {kitten.name}&apos;s rescue story, and we&apos;ll keep you posted right up until adoption day.
              </p>
            </div>
          </div>

          {sponsorshipComplete ? (
            <DonationConfirmation variant="sponsor" kittenName={kitten.name} className="mt-8" />
          ) : null}

          {!sponsorshipComplete && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SPONSOR_TIERS.map((tier) => {
              const selected = selectedTierId === tier.id && !customAmount.trim();
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => {
                    setSelectedTierId(tier.id);
                    setCustomAmount('');
                  }}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    selected
                      ? 'border-brand bg-brand-light/50 shadow-md ring-2 ring-brand/30'
                      : 'border-slate-200 bg-white hover:border-brand/40 hover:shadow-md'
                  }`}
                >
                  <p className="text-sm font-bold uppercase tracking-wide text-brand">{tier.name}</p>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900">${tier.price}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {tierDescription(tier, kitten.name)}
                  </p>
                </button>
              );
            })}

            <label
              className={`flex flex-col rounded-2xl border p-5 transition-all ${
                customAmount.trim()
                  ? 'border-brand bg-brand-light/50 shadow-md ring-2 ring-brand/30'
                  : 'border-dashed border-brand/40 bg-brand-light/20'
              }`}
            >
              <span className="text-sm font-bold text-brand">Name your own amount</span>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-500">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="50"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold text-slate-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <span className="mt-2 text-xs leading-relaxed text-slate-500">
                Not seeing your number? Give whatever feels right. Every dollar goes to work for {kitten.name} and the kittens right behind them.
              </span>
            </label>
          </div>
          )}

          {!sponsorshipComplete && !showCheckout ? (
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-brand px-6 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-brand-dark sm:max-w-md"
            >
              Sponsor {kitten.name} · ${sponsorAmount}
            </button>
          ) : null}

          {!sponsorshipComplete && showCheckout ? (
            <DonationCheckoutPanel
              widgetCode={donationWidgetCode}
              amount={sponsorAmount}
              kittenId={kitten.id}
              kittenName={kitten.name}
              tier={selectedTier.name}
              onSuccess={handleSponsorshipSuccess}
              className="mt-8"
            />
          ) : null}

          {!sponsorshipComplete ? (
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-slate-500">
            {complianceText}
          </p>
          ) : null}
        </div>
      </section>
      )}
    </div>
  );
}

export default PublicKittenProfile;
