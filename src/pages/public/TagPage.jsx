// src/pages/public/TagPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  api,
  styles,
  removeManagedHeadTags,
  upsertTag,
  buildCanonicalFromLocation,
} from '../../App.jsx';

import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';

export default function TagPage() {
  const { slug } = useParams();
  const [tag, setTag] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Canonical URL for this tag page (normalized)
  const canonical = useMemo(
    () => buildCanonicalFromLocation(['tag', String(slug || '').toLowerCase()]),
    [slug]
  );

  // Fetch tag details + tagged articles
  useEffect(() => {
    let alive = true;

    setLoading(true);
    setNotFound(false);

    Promise.all([
      api.get(`/api/tags/slug/${encodeURIComponent(slug)}`, {
        validateStatus: () => true,
      }),
      api.get(`/api/articles?tag=${encodeURIComponent(slug)}`, {
        validateStatus: () => true,
      }),
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
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [slug]);

  // SEO: tag pages are low-value listing pages → NOINDEX, FOLLOW
  useEffect(() => {
    removeManagedHeadTags();

    const baseName = tag?.name || slug || 'Tag';
    const title = `#${baseName} — NewsSite`;
    const desc =
      (tag?.description ||
        `Stories tagged #${baseName} on NewsSite`).trim() ||
      'Browse tagged stories on NewsSite';

    // title + description
    upsertTag('title', {}, { textContent: title });
    upsertTag('meta', {
      name: 'description',
      content: desc,
    });

    // canonical
    upsertTag('link', { rel: 'canonical', href: canonical });

    // IMPORTANT: tell Google not to index tag listing pages
    upsertTag('meta', {
      name: 'robots',
      content: 'noindex,follow',
      'data-managed': 'robots',
    });
  }, [tag, canonical, slug]);

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
            <h1 className="mb-4">#{tag?.name || slug}</h1>

            {articles.length === 0 ? (
              <p>No articles yet for this tag.</p>
            ) : (
              <ul className="space-y-4">
                {articles.map((a) => (
                  <li key={a._id} className="p-4 bg-white rounded-xl">
                    <Link
                      to={`/article/${a.slug}`}
                      className="text-lg font-semibold"
                    >
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
