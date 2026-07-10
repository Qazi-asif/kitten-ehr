import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Home, PawPrint, ShoppingBag } from 'lucide-react';
import { isDonatePageLive } from '../../constants/siteFeatures';
import { DEFAULT_GIVEBUTTER_SPONSOR_EMBED } from '../../constants/givebutterDefaults';
import { sponsorshipOverflowDisclosure } from '../../constants/donationCopy';
import { WISHLIST_OWNER_TYPES, WISHLIST_RETAILER_META } from '../../constants/wishlists';
import GivebutterDonationWidget from '../../components/GivebutterDonationWidget';
import {
  fetchPublicKittenById,
  fetchPublicKittenUpdates,
  fetchPublicSettings,
  fetchPublicWishlists,
} from '../../services/publicApi';
import { markCheckoutSuccessParam } from '../../hooks/useGivebutterCheckout';
import KittenPhoto from '../../components/KittenPhoto';

const PREVIEW_UPDATE_COUNT = 2;

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

function formatUpdateDateShort(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPublicAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  if (Number.isNaN(dob.getTime()) || dob > now) return null;

  const totalWeeks = Math.floor((now.getTime() - dob.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (totalWeeks < 52) {
    return `${totalWeeks} Week${totalWeeks === 1 ? '' : 's'}`;
  }

  const years = Math.floor(totalWeeks / 52);
  return `${years} Year${years === 1 ? '' : 's'}`;
}

function HeroWave() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 w-full translate-y-px text-white">
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-12 w-full sm:h-16 md:h-20" aria-hidden>
        <path
          fill="currentColor"
          d="M0,48 C240,80 480,0 720,32 C960,64 1200,16 1440,48 L1440,80 L0,80 Z"
        />
      </svg>
    </div>
  );
}

function PublicKittenProfile() {
  const { id } = useParams();
  const sponsorRef = useRef(null);
  const wishlistRef = useRef(null);
  const updatesRef = useRef(null);
  const [kitten, setKitten] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sponsorshipComplete, setSponsorshipComplete] = useState(false);
  const [donatePageLive, setDonatePageLive] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(false);

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
        setDonatePageLive(Boolean(settingsData?.donatePageLive));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSponsorshipSuccess = useCallback(() => {
    setSponsorshipComplete(true);
    markCheckoutSuccessParam('sponsor');
  }, []);

  function scrollToRef(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white text-slate-500">
        Loading profile...
      </div>
    );
  }

  if (error) return <div className="px-6 py-12 text-red-600">{error}</div>;

  const bondedLabel = kitten.bondedWithKitten?.name || kitten.bondedWithName;
  const ageLabel = formatPublicAge(kitten.dateOfBirth);
  const detailParts = [
    kitten.sex || null,
    ageLabel,
    kitten.breed || 'Mixed',
  ].filter(Boolean);
  const detailLine = detailParts.join(' • ');

  const visibleUpdates = showAllUpdates ? updates : updates.slice(0, PREVIEW_UPDATE_COUNT);
  const hasMoreUpdates = updates.length > PREVIEW_UPDATE_COUNT;
  const showSponsorPanel = isDonatePageLive({ donatePageLive });

  return (
    <div className="min-h-screen bg-white">
      {/* Photo banner */}
      <div className="relative h-64 w-full overflow-hidden bg-slate-200 sm:h-80 md:h-[22rem] lg:h-96">
        <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover object-center" />
        <HeroWave />
      </div>

      {/* Identity + action buttons */}
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-8 sm:px-6 lg:px-8">
        <Link to="/kittens" className="text-xs font-semibold text-brand hover:underline">
          ← Back to Adopt
        </Link>

        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {kitten.name}
        </h1>
        <p className="mt-2 text-base font-semibold text-emerald-600">
          {kitten.status || 'Available for Adoption'}
        </p>
        <p className="mt-1 text-sm text-slate-500">{detailLine}</p>

        {kitten.isBondedPair && bondedLabel ? (
          <p className="mt-2 text-sm text-slate-600">
            Bonded pair with <span className="font-semibold">{bondedLabel}</span>
          </p>
        ) : null}
        {kitten.isMedicalSpecialNeeds ? (
          <p className="mt-1 text-sm font-semibold text-amber-700">Medical / Special Needs</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/adopt/apply?kitten=${encodeURIComponent(kitten.name)}`}
            className="inline-flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-xs font-extrabold tracking-wide text-white shadow-md transition hover:bg-brand-dark sm:flex-none sm:text-sm"
          >
            <Home className="h-4 w-4" />
            ADOPT ME
          </Link>
          {showSponsorPanel ? (
            <button
              type="button"
              onClick={() => scrollToRef(sponsorRef)}
              className="inline-flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-xl bg-[#6F42C1] px-5 py-3.5 text-xs font-extrabold tracking-wide text-white shadow-md transition hover:bg-[#5a32a3] sm:flex-none sm:text-sm"
            >
              <PawPrint className="h-4 w-4" />
              SPONSOR ME
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => scrollToRef(wishlistRef)}
            className="inline-flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-xs font-extrabold tracking-wide text-slate-900 shadow-md transition hover:bg-amber-500 sm:flex-none sm:text-sm"
          >
            <Heart className="h-4 w-4" />
            WISHLIST
          </button>
        </div>
      </div>

      {/* Two-column body */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_320px] lg:gap-10 lg:px-8 xl:grid-cols-[1fr_360px]">
        {/* Left — About + Updates + Wishlist */}
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-bold text-slate-900">About Me</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {kitten.rescueStory
                || `${kitten.name} is full of personality and ready to meet their person. Every rescue has a story, and ${kitten.name}'s is still being written with love in foster care.`}
            </p>
          </section>

          <section ref={updatesRef}>
            <h2 className="text-xl font-bold text-slate-900">Recent Updates</h2>
            {updates.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No public updates yet. Check back soon!</p>
            ) : (
              <div className="relative mt-6">
                <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-brand/25" aria-hidden />
                <ol className="space-y-8">
                  {visibleUpdates.map((entry) => {
                    const images = extractImagesFromContent(entry.content);
                    const text = stripImagesFromContent(entry.content);
                    const thumb = images[0];

                    return (
                      <li key={entry.id} className="relative pl-8">
                        <span
                          className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-white bg-brand shadow-sm ring-2 ring-brand/20"
                          aria-hidden
                        />
                        <time className="text-sm font-bold text-slate-800">
                          {formatUpdateDateShort(entry.createdAt)}
                        </time>
                        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
                          {text ? (
                            <p className="flex-1 text-sm leading-relaxed text-slate-600">{text}</p>
                          ) : null}
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="h-20 w-28 shrink-0 rounded-lg border border-slate-200 object-cover shadow-sm"
                            />
                          ) : (
                            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                              <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {hasMoreUpdates && !showAllUpdates ? (
                  <button
                    type="button"
                    onClick={() => setShowAllUpdates(true)}
                    className="mt-6 text-sm font-bold text-brand hover:underline"
                  >
                    View all updates
                  </button>
                ) : null}
              </div>
            )}
          </section>

          <section
            ref={wishlistRef}
            id="wishlist"
            className="scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50 p-6"
          >
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
              Wishlist
            </h2>
            {wishlists.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Send supplies directly to support {kitten.name}&apos;s care.
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
                        className={`rounded-xl border px-4 py-3 text-center text-sm font-bold transition-colors ${meta.buttonClass || 'border-slate-200 bg-white text-slate-800 hover:bg-white/80'}`}
                      >
                        {item.label || meta.label || item.retailer}
                      </a>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Wishlist links for {kitten.name} are coming soon.{' '}
                <Link to="/donate" className="font-semibold text-brand hover:underline">
                  Visit our donation page
                </Link>{' '}
                to support their care today.
              </p>
            )}
          </section>
        </div>

        {/* Right — Sponsor panel */}
        {showSponsorPanel ? (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div
              ref={sponsorRef}
              id="sponsor"
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
            >
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Sponsor {kitten.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Chip in any amount to help cover food, vaccines, and care on the road to adoption day.
                </p>
              </div>

              <div className="px-4 py-4">
                {!sponsorshipComplete ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                    <GivebutterDonationWidget
                      code={DEFAULT_GIVEBUTTER_SPONSOR_EMBED}
                      kittenId={kitten.id}
                      kittenName={kitten.name}
                      sponsor
                      onSuccess={handleSponsorshipSuccess}
                      className="min-h-[360px] w-full"
                    />
                  </div>
                ) : (
                  <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    Thank you for sponsoring {kitten.name}!
                  </p>
                )}
                <p className="mt-3 text-center text-xs text-slate-500">
                  {sponsorshipOverflowDisclosure(kitten.name)}
                </p>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export default PublicKittenProfile;
