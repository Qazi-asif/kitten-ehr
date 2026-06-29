import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Heart, Home, PawPrint, Users } from 'lucide-react';
import PublicLogo from '../../components/PublicLogo';
import PublicKittenCard from '../../components/PublicKittenCard';
import { fetchPublicKittens, fetchPublicStats } from '../../services/publicApi';

const pillars = [
  { icon: Heart, title: 'Rescue', text: 'Saving neonatal and special-needs kittens from the streets and shelters.' },
  { icon: Home, title: 'Wellness', text: 'Round-the-clock medical care, nutrition, and foster support.' },
  { icon: BookOpen, title: 'Educate', text: 'Resources for adopters, fosters, and the community.' },
  { icon: Users, title: 'Community', text: 'Building a network of volunteers and forever homes.' },
];

const rescueNeeds = [
  'Kitten Formula',
  'Canned Cat Food',
  'Litter & Supplies',
  'Medical Fund',
  'Foster Supplies',
];

function HomePage() {
  const [stats, setStats] = useState({ availableKittens: 0, adoptedKittens: 0, activeFosters: 0 });
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    fetchPublicStats().then(setStats).catch(() => {});
    fetchPublicKittens().then((data) => setFeatured(data.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-light/60">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <PublicLogo className="mb-6" />
            <h1 className="text-3xl font-bold leading-tight text-slate-900 lg:text-4xl">
              Every Kitten Deserves a Chance
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              Pawsitive Transformations rescues, fosters, and finds loving homes for kittens in need across our community.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/kittens" className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark">
                Adopt a Cat
              </Link>
              <Link to="/donate" className="rounded-md border-2 border-brand bg-white px-6 py-3 text-sm font-semibold text-brand hover:bg-brand-light">
                Make a Donation
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
              <img src="/images/hero.jpg" alt="Adoptable kitten" className="aspect-[4/3] w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="border-y border-slate-100 bg-white py-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {pillars.map(({ icon: Icon, title, text }) => (
            <div key={title} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-light text-brand">
                <Icon className="h-6 w-6" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-sm font-bold uppercase tracking-wider text-brand">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Cats */}
      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">Featured Cats</h2>
          <div className="mt-8 flex justify-center gap-6 overflow-x-auto pb-4">
            {featured.length === 0 ? (
              <p className="text-slate-500">New arrivals coming soon!</p>
            ) : (
              featured.map((kitten) => (
                <PublicKittenCard key={kitten.id} kitten={kitten} compact />
              ))
            )}
          </div>
          <div className="mt-6 text-center">
            <Link to="/kittens" className="inline-block rounded-md border border-brand px-6 py-2.5 text-sm font-semibold text-brand hover:bg-brand-light">
              View All Cats
            </Link>
          </div>
        </div>
      </section>

      {/* Current Rescue Needs */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Current Rescue Needs</h2>
          <ul className="mt-8 space-y-3 text-left">
            {rescueNeeds.map((need) => (
              <li key={need} className="flex items-center gap-3 text-slate-700">
                <PawPrint className="h-4 w-4 shrink-0 text-brand" />
                <span>{need}</span>
              </li>
            ))}
          </ul>
          <Link to="/donate" className="mt-8 inline-block rounded-md bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            See All Needs
          </Link>
        </div>
      </section>

      {/* Our Impact */}
      <section className="bg-brand-muted py-14">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Our Impact</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <p className="text-4xl font-extrabold text-brand">2,450+</p>
              <p className="mt-2 text-sm font-medium text-slate-600">Cats Rescued</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-brand">15,000+</p>
              <p className="mt-2 text-sm font-medium text-slate-600">Lives Touched</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            Currently {stats.availableKittens} available for adoption · {stats.activeFosters} active foster homes
          </p>
          <Link to="/about" className="mt-8 inline-block rounded-md border border-brand px-6 py-2.5 text-sm font-semibold text-brand hover:bg-white">
            Our Story
          </Link>
        </div>
      </section>

      {/* Quote Banner */}
      <section className="relative overflow-hidden bg-slate-900">
        <img src="/images/gallery/rescue-1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
          <p className="text-2xl font-medium italic leading-relaxed text-white lg:text-3xl">
            &ldquo;Every rescue transforms two lives — a cat&apos;s and yours.&rdquo;
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
