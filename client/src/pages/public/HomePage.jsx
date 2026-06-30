import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, Home, Users, Cat } from 'lucide-react';
import { fetchPublicKittens, fetchPublicStats } from '../../services/publicApi';
import { getKittenImageUrl } from '../../utils/kittenImages';

// Custom Paw Icon matching the logo design
function PawIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className}>
      {/* Toes */}
      <circle cx="25" cy="30" r="9" />
      <circle cx="43" cy="18" r="10" />
      <circle cx="63" cy="18" r="10" />
      <circle cx="81" cy="32" r="9" />
      {/* Bottom Pad */}
      <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
    </svg>
  );
}

const pillars = [
  { icon: Cat, title: 'Rescue', text: 'Saving cats and kittens in need.' },
  { icon: Heart, title: 'Wellness', text: 'Supporting the wellness of cats and people.' },
  { icon: BookOpen, title: 'Educate', text: 'Providing resources for a better future.' },
  { icon: Users, title: 'Community', text: 'Building a stronger, compassionate community.' },
];

const rescueNeeds = [
  'Kitten Formula & Bottles',
  'Canned Cat Food (Kittens & Adults)',
  'Litter (Unscented)',
  'Fleece Blankets & Towels',
];

function HomePage() {
  const [stats, setStats] = useState({ availableKittens: 0, adoptedKittens: 0, activeFosters: 0 });
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetchPublicStats().then(setStats).catch(() => { });
    fetchPublicKittens().then((data) => setFeatured(data.slice(0, 4))).catch(() => { });
  }, []);

  const displayCats = featured.length >= 4
    ? featured.slice(0, 4).map(c => ({ image: getKittenImageUrl(c, { allowFallback: true }) }))
    : [
      { image: '/images/kittens/biscuit.jpg' },
      { image: '/images/kittens/gravy.jpg' },
      { image: '/images/kittens/nugget.jpg' },
      { image: '/images/kittens/cute.png' },
    ];

  return (
    <div className="overflow-hidden bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white py-16 lg:py-24 lg:min-h-[640px] flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Hero Left Content */}
            <div className="relative z-10 lg:pr-8">
              {/* Customized Brand Logo Block */}
              <div className="mb-8">
                <h1 className="font-serif-brand text-[56px] font-normal leading-none text-slate-800 tracking-tight lowercase">
                  pawsitive
                </h1>
                <div className="flex items-center gap-3 text-brand tracking-[0.25em] font-bold text-xs uppercase my-2.5">
                  <span className="h-[1.5px] w-6 bg-brand"></span>
                  TRANSFORMATIONS
                  <span className="h-[1.5px] w-6 bg-brand"></span>
                </div>
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-[0.05em]">
                  Cat Rescue & Human Wellness
                </p>
              </div>

              {/* Description Text */}
              <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Pawsitive Transformations is dedicated to improving the lives of cats and people through rescue, advocacy, education, wellness initiatives, and community support.
              </p>

              {/* Action Buttons */}
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/kittens"
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-dark hover:shadow-lg"
                >
                  Adopt a Cat
                </Link>
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center rounded-lg bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-dark hover:shadow-lg"
                >
                  <svg className="mr-2 h-4 w-4 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Make a Donation
                </Link>
              </div>
            </div>

            {/* Hero Right Content (Mobile) */}
            <div className="relative flex items-center justify-center lg:hidden">
              <div className="relative max-w-sm sm:max-w-md">
                <img
                  src="/images/hero-cat.png"
                  alt="Pawsitive Transformations Cat"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Right Content (Desktop - Aligned to right edge) */}
        <div className="hidden lg:block absolute top-12 lg:top-20 bottom-0 right-0 w-[50%] z-0 pointer-events-none">
          <img
            src="/images/hero-cat.png"
            alt="Pawsitive Transformations Cat"
            className="w-full h-full object-contain object-right lg:object-right-bottom"
          />
        </div>
      </section>

      {/* Core Pillars */}
      <section className="border-y border-slate-100 bg-brand-muted/30 py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand text-brand bg-white shadow-sm">
                  <Icon className="h-6.5 w-6.5 stroke-[2]" />
                </div>
                <h3 className="mt-5 text-sm font-bold uppercase tracking-[0.25em] text-brand">
                  {title}
                </h3>
                <p className="mt-3 max-w-[200px] text-xs font-semibold leading-relaxed text-slate-500">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-3 lg:gap-8">

            {/* Featured Cats */}
            <div className="flex flex-col justify-between pr-0 lg:pr-10 lg:border-r lg:border-slate-200">
              <div>
                <h2 className="flex items-center gap-2.5 text-base font-extrabold uppercase tracking-[0.15em] text-slate-800">
                  <PawIcon className="h-5 w-5 text-brand" />
                  Featured Cats
                </h2>
                <div className="mt-8 grid grid-cols-4 gap-2">
                  {displayCats.map((cat, idx) => (
                    <div key={idx} className="overflow-hidden rounded-lg border border-slate-200 aspect-[3/4] bg-slate-50">
                      <img src={cat.image} alt="Featured Kitten" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-10 text-center lg:text-left">
                <Link
                  to="/kittens"
                  className="inline-flex rounded-lg bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
                >
                  View All Cats
                </Link>
              </div>
            </div>

            {/* Current Rescue Needs */}
            <div className="flex flex-col justify-between px-0 lg:px-10 lg:border-r lg:border-slate-200">
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-[0.15em] text-slate-800">
                  Current Rescue Needs
                </h2>
                <ul className="mt-8 space-y-4 text-slate-600">
                  {rescueNeeds.map((need) => (
                    <li key={need} className="flex items-center gap-3">
                      <PawIcon className="h-4 w-4 text-brand shrink-0" />
                      <span className="text-xs font-semibold leading-relaxed tracking-wide">{need}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 text-center lg:text-left">
                <Link
                  to="/donate"
                  className="inline-flex rounded-lg bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
                >
                  See All Needs
                </Link>
              </div>
            </div>

            {/* Our Impact */}
            <div className="flex flex-col justify-between pl-0 lg:pl-10">
              <div>
                <h2 className="flex items-center gap-2 text-base font-extrabold uppercase tracking-[0.15em] text-slate-800">
                  <svg className="h-5 w-5 fill-current text-brand" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  Our Impact
                </h2>
                <div className="mt-8 space-y-8">
                  <div>
                    <p className="text-5xl font-extrabold tracking-tight text-brand">2,450+</p>
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Cats Rescued</p>
                  </div>
                  <div>
                    <p className="text-5xl font-extrabold tracking-tight text-brand">15,000+</p>
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Lives Touched</p>
                  </div>
                </div>
              </div>
              <div className="mt-10 text-center lg:text-left">
                <Link
                  to="/about"
                  className="inline-flex rounded-lg bg-brand px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark"
                >
                  Our Story
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer Image Section */}
      <section className="relative w-full flex leading-[0]">
        <img
          src="/images/below-sec.png"
          alt="Below Section"
          className="w-full h-auto object-cover"
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="mx-auto h-full w-full max-w-7xl relative px-6 lg:px-8">
            <img
              src="/images/kittens/cute.png"
              alt="Happy resting cat"
              className="absolute bottom-0 right-6 lg:right-8 h-32 md:h-48 lg:h-[22rem] xl:h-[26rem] object-contain object-bottom pointer-events-auto"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
