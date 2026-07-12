import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Home, PawPrint, ShoppingBag, Menu } from 'lucide-react';
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
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="block h-16 w-full sm:h-24 md:h-32" aria-hidden>
        <path
          fill="currentColor"
          d="M0,120 L1440,120 L1440,0 C1100,80 700,120 0,60 Z"
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

  const effectiveStatus = kitten.status || 'Available for Adoption';
  const isAvailableForAdoption = effectiveStatus === 'Available for Adoption';
  const isAdopted = effectiveStatus === 'Adopted';

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

  const sponsorTiers = [
    { label: "One Meal", price: 5 },
    { label: "One Week Food", price: 25 },
    { label: "One Month Food", price: 75 },
    { label: "Spay Surgery", price: 125 },
    { label: "Full Sponsor", price: 200 },
  ];

  const raised = 125;
  const goal = 1000;
  const percent = Math.round((raised / goal) * 100);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 pb-16">
      
      {/* HERO SECTION */}
      <div className="relative w-full bg-[#f8f5f0] pt-12 lg:pt-20 pb-24 lg:pb-32 overflow-hidden">
        
        {/* Decorative background paw prints (optional, faint) */}
        <PawPrint className="absolute top-10 left-10 text-gray-200/40" size={120} />
        <PawPrint className="absolute bottom-20 right-10 text-gray-200/40" size={160} />
        <PawPrint className="absolute top-[40%] right-[40%] text-gray-200/30" size={80} />

        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Details */}
            <div className="flex flex-col justify-center order-2 lg:order-1 relative z-10">
              <Link to="/kittens" className="text-sm font-bold text-[#0d9488] hover:underline mb-4 inline-block w-max">
                ← Back to Adopt
              </Link>
              <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl mb-2">
                {kitten.name}
              </h1>
              <p className="mt-2 text-xl font-bold text-[#0d9488]">
                {kitten.status || 'Available for Adoption'}
              </p>
              
              <div className="mt-4 flex items-center flex-wrap gap-2 text-sm font-medium text-gray-600">
                 <span className="flex items-center gap-1"><PawPrint size={14} className="text-gray-400" /> {kitten.sex || 'Unknown'}</span>
                 <span className="text-gray-300">•</span>
                 <span className="flex items-center gap-1"><PawPrint size={14} className="text-gray-400" /> {kitten.breed || 'Domestic Short Hair'}</span>
                 <span className="text-gray-300">•</span>
                 <span className="flex items-center gap-1"><PawPrint size={14} className="text-gray-400" /> {formatPublicAge(kitten.dateOfBirth) || 'Young'}</span>
              </div>

              {/* Extra details */}
              <div className="mt-6 space-y-2">
                 <p className="text-sm font-bold text-gray-800">Bonded pair with <span className="font-extrabold text-gray-900">QA Test Partner Cat</span></p>
                 <p className="text-sm font-bold text-[#d97706]">Medical / Special Needs</p>
              </div>

              {/* Status banner (shown instead of ADOPT ME when the kitten isn't currently available) */}
              {!isAvailableForAdoption && (
                <div
                  className={`mt-6 inline-flex w-max items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${
                    isAdopted ? 'bg-teal-50 text-teal-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isAdopted
                    ? `🎉 ${kitten.name} has found their forever home!`
                    : `${kitten.name} is not currently available for adoption.`}
                </div>
              )}

              {/* Buttons */}
              <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-4">
                {isAvailableForAdoption && (
                  <Link
                    to={`/adopt/apply?kitten=${encodeURIComponent(kitten.name)}`}
                    className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-md transition hover:bg-[#0f766e]"
                  >
                    <Home className="h-4 w-4" fill="currentColor" />
                    ADOPT ME
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => scrollToRef(sponsorRef)}
                  className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[#8b3dff] px-6 py-3.5 text-sm font-bold tracking-wide text-white shadow-md transition hover:bg-[#7b32e6]"
                >
                  <PawPrint className="h-4 w-4" fill="currentColor" />
                  SPONSOR ME
                </button>
                <button
                  type="button"
                  onClick={() => scrollToRef(wishlistRef)}
                  className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-[#ffb703] px-6 py-3.5 text-sm font-bold tracking-wide text-gray-900 shadow-md transition hover:bg-[#e6a500]"
                >
                  <Heart className="h-4 w-4" />
                  WISHLIST
                </button>
              </div>
            </div>

            {/* Right Column: Image */}
            <div className="relative flex justify-center items-end order-1 lg:order-2 h-[350px] sm:h-[450px] lg:h-[450px]">
              {/* Teal circle background */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] bg-[#d5e7df] rounded-full z-0"></div>
              
              {/* Floating decorative elements */}
              <Heart className="absolute top-[15%] left-[10%] text-[#a3c9b8]" size={40} />
              <div className="absolute top-[20%] right-[15%] text-[#a3c9b8] font-bold text-2xl -rotate-12">///</div>
              
              {/* Image */}
              <div className="relative z-10 w-full max-w-[400px] h-[110%] flex items-end">
                 <KittenPhoto kitten={kitten} allowFallback className="w-full h-full object-contain md:object-cover object-bottom drop-shadow-[0_20px_30px_rgba(0,0,0,0.15)] rounded-[2rem]" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave at bottom */}
        <HeroWave />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Two-column body */}
        <div className="mt-12 grid grid-cols-1 gap-12 px-6 sm:px-8 lg:px-12 lg:grid-cols-[1fr_360px]">
          {/* Left — About + Updates */}
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About Me</h2>
              <p className="text-base leading-relaxed text-gray-700 font-medium">
                {kitten.rescueStory ||
                  `${kitten.name} was found with her littermates in a cardboard box behind a grocery store. She is sweet, playful, and loves other kittens. ${kitten.name} is spayed, vaccinated, and ready for her forever home!`}
              </p>
            </section>

            <section ref={updatesRef}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Updates</h2>
              {updates.length === 0 ? (
                <p className="text-sm font-medium text-gray-500">No public updates yet. Check back soon!</p>
              ) : (
                <div className="relative">
                  <div className="absolute bottom-6 left-[11px] top-6 w-0.5 bg-gray-200" aria-hidden />
                  <ol className="space-y-8">
                    {visibleUpdates.map((entry, i) => {
                      const images = extractImagesFromContent(entry.content);
                      const text = stripImagesFromContent(entry.content);
                      const thumb = images[0];

                      return (
                        <li key={entry.id} className="relative pl-10 flex flex-col sm:flex-row gap-5 items-start py-2">
                          <span
                            className="absolute left-[7px] top-5 h-2.5 w-2.5 rounded-full bg-teal-500 ring-4 ring-white"
                            aria-hidden
                          />
                          <div className="flex-1 mt-3">
                            <time className="text-sm font-bold text-gray-900">
                              {formatUpdateDateShort(entry.createdAt)}
                            </time>
                            {text ? (
                              <p className="mt-2 text-sm font-medium leading-relaxed text-gray-700">{text}</p>
                            ) : null}
                          </div>
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="h-24 w-32 shrink-0 rounded-xl object-cover shadow-sm border border-gray-200"
                            />
                          ) : (
                            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                              <KittenPhoto kitten={kitten} allowFallback className="h-full w-full object-cover" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  {hasMoreUpdates && !showAllUpdates ? (
                    <button
                      type="button"
                      onClick={() => setShowAllUpdates(true)}
                      className="mt-8 text-sm font-bold text-teal-600 hover:underline"
                    >
                      View all updates
                    </button>
                  ) : null}
                </div>
              )}
            </section>
          </div>

          {/* Right — Sponsor panel */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div
              ref={sponsorRef}
              id="sponsor"
              className="scroll-mt-24 rounded-3xl border border-gray-100 bg-[#f8f9fa] p-6 sm:p-8 shadow-sm"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-1">Sponsor {kitten.name}</h3>
              <p className="text-xs font-bold text-gray-500 mb-2 tracking-wide uppercase">June Care Goal</p>
              <p className="text-base font-bold text-gray-900">
                ${raised} of ${goal}
              </p>

              <div className="w-full bg-gray-200 rounded-full h-3 mt-4 overflow-hidden">
                <div
                  className="bg-teal-500 h-3 rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-right text-xs font-bold text-gray-500 mt-2">{percent}%</p>

              <div className="mt-8 space-y-4">
                {sponsorTiers.map((tier, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm font-semibold text-gray-700"
                  >
                    <span className="flex items-center gap-2.5">
                      <PawPrint size={16} className="text-teal-500" fill="currentColor" />
                      {tier.label}
                    </span>
                    <span className="font-bold text-gray-900 text-base">
                      ${tier.price}
                    </span>
                  </div>
                ))}
              </div>

              {!showSponsorPanel ? (
                <button className="w-full bg-[#8b3dff] text-white font-bold text-sm py-4 rounded-xl mt-8 opacity-50 cursor-not-allowed">
                  DONATE NOW
                </button>
              ) : !sponsorshipComplete ? (
                <div className="mt-8">
                  <GivebutterDonationWidget
                    code={DEFAULT_GIVEBUTTER_SPONSOR_EMBED}
                    kittenId={kitten.id}
                    kittenName={kitten.name}
                    sponsor
                    onSuccess={handleSponsorshipSuccess}
                    className="min-h-[300px] w-full"
                  />
                </div>
              ) : (
                <p className="mt-8 rounded-xl bg-teal-50 px-4 py-4 text-center text-sm font-bold text-teal-800">
                  Thank you for sponsoring {kitten.name}!
                </p>
              )}
              <p className="text-xs font-medium text-gray-400 text-center mt-4">
                All donations are tax deductible
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default PublicKittenProfile;
