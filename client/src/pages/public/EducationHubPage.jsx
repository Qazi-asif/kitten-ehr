import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublicContent } from '../../services/publicApi';
import {
  CONTENT_CATEGORY_SUCCESS_STORY,
  EDUCATION_CATEGORIES,
  articleExcerpt,
  normalizeEducationCategory,
} from '../../constants/educationCategories';

const DEFAULT_ICON = (
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
    <circle cx="32" cy="32" r="22" />
    <path d="M24 34c2 4 6 6 8 6s6-2 8-6" />
    <circle cx="24" cy="26" r="2" fill="currentColor" stroke="none" />
    <circle cx="40" cy="26" r="2" fill="currentColor" stroke="none" />
  </svg>
);

const CATEGORY_ICONS = {
  'General Education': DEFAULT_ICON,
  'Becoming a Foster': (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
      <rect x="8" y="20" width="48" height="30" rx="3" />
      <path d="M16 20 L16 14 L48 14 L48 20" />
      <line x1="20" y1="30" x2="44" y2="30" />
      <line x1="20" y1="38" x2="44" y2="38" />
      <line x1="20" y1="46" x2="36" y2="46" />
    </svg>
  ),
  'Kitten Care': (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
      <path d="M32 8 C28 8 24 11 24 16 L24 24 C24 24 20 26 20 32 L20 50 C20 54 24 56 28 56 L36 56 C40 56 44 54 44 50 L44 32 C44 26 40 24 40 24 L40 16 C40 11 36 8 32 8Z" />
      <circle cx="32" cy="14" r="3" fill="currentColor" stroke="none" />
    </svg>
  ),
  'Colony & Feral Care': (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
      <path d="M12 48 L12 28 L32 14 L52 28 L52 48 Z" />
      <rect x="24" y="34" width="16" height="14" rx="2" />
    </svg>
  ),
  'Health & Emergency Care': (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-brand">
      <path d="M32 8 L12 20 L12 44 L32 56 L52 44 L52 20 Z" />
      <path d="M32 22 v12 M32 38 v4" strokeWidth="3" />
    </svg>
  ),
};

function EducationHubPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicContent()
      .then(setArticles)
      .finally(() => setLoading(false));
  }, []);

  const articlesByCategory = useMemo(() => {
    const grouped = Object.fromEntries(
      EDUCATION_CATEGORIES.map((category) => [category.name, []]),
    );

    articles.forEach((article) => {
      if (article.category === CONTENT_CATEGORY_SUCCESS_STORY) return;

      const categoryName = normalizeEducationCategory(article.category);
      if (grouped[categoryName]) {
        grouped[categoryName].push(article);
      } else if (grouped['General Education']) {
        grouped['General Education'].push(article);
      }
    });

    return grouped;
  }, [articles]);

  return (
    <div className="relative overflow-hidden bg-white">
      <div className="mx-auto flex max-w-7xl items-start lg:pr-[min(40vw,430px)]">
        <div className="min-w-0 flex-1">
          <div className="px-6 pt-10 pb-6 lg:px-8">
            <h1 className="flex items-center gap-3 text-6xl font-extrabold tracking-tight text-brand">
              Education Hub
              <svg viewBox="0 0 100 100" fill="currentColor" className="h-11 w-11 text-brand">
                <circle cx="25" cy="30" r="9" />
                <circle cx="43" cy="18" r="10" />
                <circle cx="63" cy="18" r="10" />
                <circle cx="81" cy="32" r="9" />
                <path d="M 52,43 C 33,43 21,57 21,72 C 21,87 34,96 52,96 C 70,96 83,87 83,72 C 83,57 71,43 52,43 Z" />
              </svg>
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-600">
              Everything we know, in your corner.
            </p>
          </div>

          <div className="px-6 pb-8 lg:px-8">
            <p className="max-w-3xl text-base leading-relaxed text-slate-600">
              Good information saves lives. Whether you&apos;re bottle-feeding your first litter, caring for a colony, fostering for us, or just want to keep your own cat safe and healthy, this is where we share what we&apos;ve learned. Browse the guides below, and come back often. We&apos;re always adding more.
            </p>
          </div>

          <div className="space-y-12 px-6 pb-16 lg:px-8">
            {loading ? (
              <p className="text-slate-500">Loading resources...</p>
            ) : (
              EDUCATION_CATEGORIES.map((category) => {
                const categoryArticles = articlesByCategory[category.name] || [];

                return (
                  <section key={category.name}>
                    <div className="flex items-start gap-4 border-b border-brand/15 pb-4">
                      <div className="shrink-0">{CATEGORY_ICONS[category.name] || DEFAULT_ICON}</div>
                      <div>
                        <h2 className="text-2xl font-extrabold text-brand">{category.name}</h2>
                      </div>
                    </div>

                    {categoryArticles.length === 0 ? null : (
                      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {categoryArticles.map((article) => (
                          <div
                            key={article.id}
                            className="flex flex-col rounded-2xl border border-brand/25 bg-white p-6"
                          >
                            <h3 className="text-base font-extrabold leading-snug text-slate-900">
                              {article.title}
                            </h3>
                            {article.body && (
                              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                {articleExcerpt(article.body)}
                              </p>
                            )}
                            <div className="mt-4">
                              <Link
                                to={`/education/${article.slug}`}
                                className="inline-block rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
                              >
                                Read Article
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[min(40vw,430px)] lg:block">
        <img
          src="/images/education-right.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-left-top"
        />
        <img
          src="/images/education-kitten.png"
          alt="Education kitten"
          className="absolute bottom-0 right-0 h-auto w-full object-contain object-bottom"
        />
      </div>
    </div>
  );
}

export default EducationHubPage;
