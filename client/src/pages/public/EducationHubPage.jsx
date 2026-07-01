import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicContent } from '../../services/publicApi';

// Static resource cards matching the reference image exactly
const STATIC_RESOURCES = [
  {
    title: 'Found Kittens',
    desc: 'What to do if you find kittens, including care and safety tips.',
    slug: 'bottle-feeding-basics',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
        <path d="M32 8 C28 8 24 11 24 16 L24 24 C24 24 20 26 20 32 L20 50 C20 54 24 56 28 56 L36 56 C40 56 44 54 44 50 L44 32 C44 26 40 24 40 24 L40 16 C40 11 36 8 32 8Z" />
        <circle cx="32" cy="14" r="3" fill="currentColor" stroke="none" />
        <path d="M28 36 h8 M28 44 h8" />
      </svg>
    ),
  },
  {
    title: 'Found Injured Cats',
    desc: 'Steps to take when you find an injured or sick cat.',
    slug: 'preparing-your-home',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
        <rect x="14" y="14" width="36" height="36" rx="4" />
        <path d="M32 24 v16 M24 32 h16" />
      </svg>
    ),
  },
  {
    title: 'TNR Resources',
    desc: 'Learn about Trap, Neuter, Return and how you can help.',
    slug: 'foster-expectations',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
        <rect x="8" y="20" width="48" height="30" rx="3" />
        <path d="M16 20 L16 14 L48 14 L48 20" />
        <line x1="20" y1="30" x2="44" y2="30" />
        <line x1="20" y1="38" x2="44" y2="38" />
        <line x1="20" y1="46" x2="36" y2="46" />
        <path d="M8 26 L56 26" />
      </svg>
    ),
  },
  {
    title: 'Cat Colony Care',
    desc: 'Best practices for caring for community cat colonies.',
    slug: 'bottle-feeding-basics',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
        <path d="M12 48 L12 28 L32 14 L52 28 L52 48 Z" />
        <rect x="24" y="34" width="16" height="14" rx="2" />
        <path d="M32 34 v-8" />
        <circle cx="32" cy="24" r="4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'FIV / FeLV Resources',
    desc: 'Information and support for cats living with FIV or FeLV.',
    slug: 'foster-expectations',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
        <path d="M32 8 L12 20 L12 44 L32 56 L52 44 L52 20 Z" />
        <path d="M32 22 v12 M32 38 v4" strokeWidth="3" />
      </svg>
    ),
  },
  {
    title: 'Community Wellness Resources',
    desc: 'Resources to support mental, emotional and physical wellness.',
    slug: 'preparing-your-home',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
        <path d="M32 44 C32 44 10 32 10 18 C10 10 16 6 22 6 C26 6 29 9 32 13 C35 9 38 6 42 6 C48 6 54 10 54 18 C54 32 32 44 32 44Z" />
        <path d="M18 52 C22 46 28 44 32 44 C36 44 42 46 46 52" />
      </svg>
    ),
  },
];

function EducationHubPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicContent()
      .then(setArticles)
      .finally(() => setLoading(false));
  }, []);

  const items = articles.length > 0
    ? articles.map((a, i) => ({
      title: a.title,
      desc: a.category,
      slug: a.slug,
      icon: STATIC_RESOURCES[i % STATIC_RESOURCES.length]?.icon || STATIC_RESOURCES[0].icon,
    }))
    : STATIC_RESOURCES;

  return (
    <div className="bg-white overflow-hidden">

      {/* Outer flex row: left content + right images side by side */}
      <div className="flex items-start">

        {/* LEFT — hero + cards, constrained width */}
        <div className="flex-1 min-w-0">
          {/* Hero */}
          <div className="px-6 pt-10 pb-6 lg:px-8">
            <h1 className="text-6xl font-extrabold tracking-tight text-brand flex items-center gap-3">
              Education Hub
              <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
                <circle cx="25" cy="30" r="9" />
                <circle cx="43" cy="18" r="10" />
                <circle cx="63" cy="18" r="10" />
                <circle cx="81" cy="32" r="9" />
                <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
              </svg>
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-600">Helpful resources for cat caregivers and community members.</p>
          </div>

          {/* Cards grid */}
          <div className="px-6 pb-16 lg:px-8">
            {loading ? (
              <p className="text-slate-500">Loading resources...</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {items.map((item) => (
                  <div
                    key={item.slug + item.title}
                    className="flex flex-col rounded-2xl border border-brand/25 bg-white p-6"
                  >
                    <div className="flex items-start gap-5">
                      <div className="shrink-0">{item.icon}</div>
                      <div className="flex-1">
                        <h2 className="text-base font-extrabold leading-snug text-brand">{item.title}</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link
                        to={`/education/${item.slug}`}
                        className="inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
                      >
                        Learn More
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — images column, fixed width, zero right margin, touches right edge */}
        <div className="hidden lg:block shrink-0 w-[380px] xl:w-[430px] self-stretch relative">
          {/* Teal blob background image — fills the full column */}
          <img
            src="/images/education-right.png"
            alt="Education background"
            className="absolute inset-0 w-full h-full object-cover object-left-top"
          />
          {/* Kitten image overlaid on top, anchored to bottom */}
          <img
            src="/images/education-kitten.png"
            alt="Education kitten"
            className="absolute bottom-0 left-0 w-full h-auto object-contain object-bottom pointer-events-none"
          />
        </div>

      </div>

    </div>
  );
}

export default EducationHubPage;
