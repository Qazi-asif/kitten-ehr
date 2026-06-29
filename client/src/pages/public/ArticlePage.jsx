import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchPublicArticle } from '../../services/publicApi';

function ArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicArticle(slug)
      .then(setArticle)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p className="px-6 py-12 text-gray-500">Loading...</p>;
  if (!article) return <p className="px-6 py-12 text-gray-500">Article not found.</p>;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/education" className="text-sm font-medium text-emerald-700 hover:underline">← Back to Education</Link>
      <span className="mt-4 block text-xs font-medium uppercase text-emerald-700">{article.category}</span>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">{article.title}</h1>
      <div className="prose mt-8 max-w-none whitespace-pre-wrap text-gray-700">{article.body}</div>
    </article>
  );
}

export default ArticlePage;
