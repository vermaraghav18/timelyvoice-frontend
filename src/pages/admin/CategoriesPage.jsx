// frontend/src/pages/public/CategoryPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';

import '../../styles/tails.css';

import {
  api,
  styles,
  removeManagedHeadTags,
  upsertTag,
  addJsonLd,
  buildCanonicalFromLocation, // ✅ import ONCE; do not redeclare
} from '../../App.jsx';

import { ensureRenderableImage } from '../../lib/images';

function usePageParam() {
  const [sp] = useSearchParams();
  const p = parseInt(sp.get('page') || '1', 10);
  return Number.isFinite(p) && p > 0 ? p : 1;
}

export default function CategoryPage() {
  const { slug: rawSlug } = useParams(); // URL piece after /category/:slug
  const slug = String(rawSlug || '').toLowerCase();
  const page = usePageParam();
  const location = useLocation();

  const [cat, setCat] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const totalPages = useMemo(
    () => (pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1),
    [total, pageSize]
  );

  // load category + articles
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr('');
      try {
        // 1) category by slug (public)
        const catRes = await api.get(`/categories/slug/${encodeURIComponent(slug)}`);
        if (cancelled) return;
        setCat(catRes.data);

        // 2) list articles (public endpoint that respects geo + published)
        const listRes = await api.get(
          `/public/categories/${encodeURIComponent(slug)}/articles?page=${page}&limit=10`
        );
        if (cancelled) return;
        setItems(listRes.data?.items || []);
        setTotal(listRes.data?.total || 0);
        setPageSize(listRes.data?.pageSize || 10);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          'Failed to load';
        setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [slug, page]);

  // head tags (canonical, title/desc, breadcrumbs)
  useEffect(() => {
    removeManagedHeadTags();

    const canon = buildCanonicalFromLocation(location); // ✅ use, not redeclare
    upsertTag('link', { rel: 'canonical' }, { href: canon });

    const titleTxt = cat?.name ? `${cat.name} — The Timely Voice` : 'Category — The Timely Voice';
    upsertTag('title', {}, { textContent: titleTxt });

    const descTxt = cat?.description
      ? cat.description
      : cat?.name
      ? `Latest news and updates in ${cat.name}.`
      : 'Latest category news and updates.';
    upsertTag('meta', { name: 'description' }, { content: descTxt });

    // breadcrumbs
    addJsonLd('breadcrumbs', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${window.location.origin}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: cat?.name || 'Category',
          item: `${window.location.origin}/category/${encodeURIComponent(slug)}`,
        },
      ],
    });
  }, [location, cat, slug]);

  return (
    <main className={styles.container}>
      <h1 className="mb-2">
        {cat?.name || 'Category'}
        {cat?.type ? (
          <span className="ml-2 text-xs align-middle px-2 py-1 rounded bg-slate-100">
            {cat.type}
          </span>
        ) : null}
      </h1>
      {cat?.description ? (
        <p className="text-slate-600 mb-4">{cat.description}</p>
      ) : null}

      {err && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{err}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p>No articles yet.</p>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {items.map((a) => {
            const img = ensureRenderableImage(a);
            return (
              <article key={a._id} className="rounded-xl bg-white border overflow-hidden">
                <Link to={`/article/${encodeURIComponent(a.slug)}`} className="block" data-hero>
                  {img ? <img src={img} alt="" loading="lazy" /> : null}
                </Link>
                <div className="p-3">
                  <h3 className="m-0 text-lg">
                    <Link to={`/article/${encodeURIComponent(a.slug)}`}>{a.title}</Link>
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">{a.summary}</p>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const search = new URLSearchParams(location.search);
            if (p === 1) search.delete('page');
            else search.set('page', String(p));
            const href = `/category/${encodeURIComponent(slug)}${search.toString() ? `?${search}` : ''}`;
            const active = p === page;
            return (
              <Link
                key={p}
                to={href}
                className={`px-3 py-1 rounded ${active ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}
              >
                {p}
              </Link>
            );
          })}
        </nav>
      )}
    </main>
  );
}
