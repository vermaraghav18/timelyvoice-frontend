// src/pages/public/TagPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, styles, removeManagedHeadTags, upsertTag } from '../../App.jsx';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { buildCanonicalFromLocation } from '../../App.jsx';

export default function TagPage() {
  const { slug } = useParams();
  const [tag, setTag] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

 const canonical = buildCanonicalFromLocation(['tag', String(slug || '').toLowerCase()]);
upsertTag('link', { rel: 'canonical', href: canonical });


  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      api.get(`/api/tags/slug/${encodeURIComponent(slug)}`, { validateStatus: () => true }),
      api.get(`/api/articles?tag=${encodeURIComponent(slug)}`, { validateStatus: () => true }),
    ])
      .then(([tRes, aRes]) => {
        if (!alive) return;
        if (tRes.status === 200 && tRes.data) {
          setTag(tRes.data);
        } else {
          setNotFound(true);
        }
        if (aRes.status === 200 && Array.isArray(aRes.data?.items)) {
          setArticles(aRes.data.items);
        } else {
          setArticles([]);
        }
      })
      .catch(() => {
        if (!alive) return;
        setNotFound(true);
        setArticles([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [slug]);

  // SEO
  useEffect(() => {
    removeManagedHeadTags();
    const title = tag ? `#${tag.name} — NewsSite` : `Tag — NewsSite`;
    const desc = tag?.description || `Stories tagged #${tag?.name || ''} on NewsSite`.trim();

    upsertTag('title', {}, { textContent: title });
    upsertTag('meta', { name: 'description', content: desc || 'Browse tags on NewsSite' });
    upsertTag('link', { rel: 'canonical', href: canonical });
  }, [tag, canonical]);

  return (
    <>
      <SiteNav />
      <main className={styles.container}>
        {loading && <p>Loading…</p>}
        {!loading && notFound && (
          <>
            <h2>Tag not found</h2>
            <p>
              Try another tag or go back to the <Link to="/">home page</Link>.
            </p>
          </>
        )}
        {!loading && !notFound && (
          <>
            <h1 className="mb-4">#{tag?.name}</h1>
            {articles.length === 0 ? (
              <p>No articles yet.</p>
            ) : (
              <ul className="space-y-4">
                {articles.map((a) => (
                  <li key={a._id} className="p-4 bg-white rounded-xl">
                    <Link to={`/article/${a.slug}`} className="text-lg font-semibold">
                      {a.title}
                    </Link>
                    <div className="text-sm opacity-75">
                      {new Date(a.publishAt || a.createdAt).toLocaleString()} •{' '}
                      {a.category?.name || ''}
                    </div>
                    <p className="mt-2 opacity-80">{a.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
