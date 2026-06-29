import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, Cat, Heart, Shield, Stethoscope, Users } from 'lucide-react';
import PublicPageHeader from '../../components/PublicPageHeader';
import { fetchPublicContent } from '../../services/publicApi';

const RESOURCE_ICONS = {
  'Kitten Care': Baby,
  Adoption: Heart,
  Fostering: Users,
  default: Cat,
};

const STATIC_RESOURCES = [
  { title: 'Found Kittens', desc: 'What to do if you find neonatal or stray kittens.', slug: 'bottle-feeding-basics', icon: Baby },
  { title: 'Found Injured Cats', desc: 'Steps for safe rescue and emergency care.', slug: 'preparing-your-home', icon: Stethoscope },
  { title: 'TNR Resources', desc: 'Trap-Neuter-Return guides for community cats.', slug: 'foster-expectations', icon: Shield },
  { title: 'Cat Colony Care', desc: 'Managing and supporting outdoor cat colonies.', slug: 'bottle-feeding-basics', icon: Cat },
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
    ? articles.map((a) => ({
        title: a.title,
        desc: a.category,
        slug: a.slug,
        icon: RESOURCE_ICONS[a.category] || RESOURCE_ICONS.default,
      }))
    : STATIC_RESOURCES;

  return (
    <div>
      <PublicPageHeader
        title="Education Hub"
        subtitle="Resources for caregivers, adopters, fosters, and community members."
        showPaw={false}
      />

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {loading ? (
              <p className="text-slate-500">Loading resources...</p>
            ) : (
              items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.slug + item.title}
                    to={`/education/${item.slug}`}
                    className="flex items-center gap-5 rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-slate-900">{item.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
                    </div>
                    <span className="hidden text-sm font-semibold text-brand sm:inline">Learn More →</span>
                  </Link>
                );
              })
            )}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24 overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.1)]">
              <img src="/images/kittens/gravy.jpg" alt="Education" className="aspect-[3/4] w-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EducationHubPage;
