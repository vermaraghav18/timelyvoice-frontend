// frontend/src/components/RelatedStories.jsx
import { useEffect, useState } from 'react';
import { api } from '../lib/publicApi';

export default function RelatedStories({
  currentSlug,
  category,           // string or { name, slug }
  limit = 6,
  title = 'Related stories',
  dense = false,      // if true: compact list
}) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'empty' | 'error'

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setStatus('loading');

        const catName = typeof category === 'string' ? category
                        : category?.name || category?.slug || '';

        // 1) try same-category
        const p1 = { page: 1, limit: limit * 2 };
        if (catName) p1.category = catName;

        const r1 = await api.get('/articles', { params: p1, validateStatus: () => true });
        let pool = (r1.data?.items || []).filter(a => a.slug !== currentSlug);

        // 2) if too few, pull global extras
        if (pool.length < limit) {
          const r2 = await api.get('/articles', { params: { page: 1, limit: limit * 2 }, validateStatus: () => true });
          const extra = (r2.data?.items || []).filter(
            a => a.slug !== currentSlug && !pool.find(p => p.slug === a.slug)
          );
          pool = [...pool, ...extra];
        }

        const sliced = pool.slice(0, limit);
        if (!cancel) {
          setItems(sliced);
          setStatus(sliced.length ? 'ok' : 'empty');
        }
      } catch {
        if (!cancel) { setItems([]); setStatus('error'); }
      }
    })();
    return () => { cancel = true; };
  }, [currentSlug, category, limit]);

  if (status === 'loading') return <div style={{ padding: 8 }}>Loading…</div>;
  if (status === 'error' || status === 'empty') return null;

  return (
    <section aria-label="Related stories" style={{ marginTop: 16 }}>
      <h2 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#fff' }}>{title}</h2>

      {/* grid for cards or dense list */}
      {!dense ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          {items.map(a => {
            const href = `/article/${encodeURIComponent(a.slug)}`;
            const img = a.coverImageUrl || a.imageUrl || a.ogImage || '';
            return (
              <a key={a._id || a.id || a.slug} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article
                  style={{
                    background: 'linear-gradient(135deg, #0a2a6b 0%, #163a8a 50%, #1d4ed8 100%)',
                    color: '#e9edff',
                    border: 0,
                    borderRadius: 0,
                    padding: 0,
                    boxShadow: '0 6px 24px rgba(0,0,0,.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={a.imageAlt || a.title || ''}
                      loading="lazy"
                      decoding="async"
                      width="640"
                      height="150"
                      style={{ width: '100%', height: 150, objectFit: 'cover', background: '#0b1f44' }}
                    />
                  ) : null}
                  <div style={{ padding: 10 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        lineHeight: 1.3,
                        fontSize: 16,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {a.title}
                    </div>
                  </div>
                </article>
              </a>
            );
          })}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(a => (
            <li key={a._id || a.id || a.slug}>
              <a href={`/article/${a.slug}`} style={{ color: '#cfe4ff', textDecoration: 'none' }}>
                {a.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
