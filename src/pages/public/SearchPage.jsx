// src/pages/public/SearchPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, styles, upsertTag, removeManagedHeadTags } from '../../App.jsx';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';

/* small debounce hook */
function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const q0 = sp.get('q') || '';
  const [q, setQ] = useState(q0);
  const dq = useDebounced(q, 300);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // ---- SEO (title, canonical, meta description) ----
  useEffect(() => {
    const url = `${window.location.origin}/search${q0 ? `?q=${encodeURIComponent(q0)}` : ''}`;
    document.title = q0 ? `Search: ${q0} – My News` : 'Search – My News';
    upsertTag('link', { rel: 'canonical', href: url }, 'rel');
    upsertTag('meta', { name: 'description', content: 'Search news articles by keyword across politics, business, tech, sports and world.' });
    return () => removeManagedHeadTags();
  }, [q0]);

  // ---- Fetch when debounced query changes ----
  useEffect(() => {
    let ignore = false;

    // empty query -> clear list and stop
    if (!dq) {
      setItems([]);
      setLoading(false);
      setErr('');
      return;
    }

    (async () => {
      setErr('');
      setLoading(true);
      try {
        const res = await api.get('/api/articles/search', { params: { q: dq, limit: 25 } });
        if (!ignore) setItems(res.data?.items || []);
      } catch {
        if (!ignore) setErr('Search failed');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => { ignore = true; };
  }, [dq]);

  // ---- Keep URL in sync while typing ----
  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    setSp(next, { replace: true });
  }, [q, setSp]);

  const placeholder = useMemo(() => 'Search articles…', []);

  return (
    <>
      <SiteNav />
      <main className="container">
        <div style={{ ...styles.nav, marginTop: 8 }}>
          <h1 style={{ margin: 0 }}>Search</h1>
          <span />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={q}
            placeholder={placeholder}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            style={{ ...styles.input, margin: 0 }}
            aria-label="Search articles"
          />
          <button
            style={styles.button}
            onClick={() => setQ('')}
            disabled={!q}
            title="Clear"
          >
            Clear
          </button>
        </div>

        {/* States */}
        {loading && <div style={{ padding: 12 }}>Searching…</div>}
        {err && <div style={{ color: 'crimson' }}>{err}</div>}

        {!loading && !err && (
          <section>
            {/* Empty state */}
            {(!q || items.length === 0) ? (
              <div style={styles.card}>
                <div style={styles.muted}>
                  {q ? 'No results.' : 'Type a keyword to search.'}
                </div>
              </div>
            ) : (
              items.map((a) => (
                <Link
                  key={a._id || a.id || a.slug}
                  to={`/article/${a.slug}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {/* Match homepage look: image on left with reserved ratio */}
                  <article
                    style={{
                      ...styles.card,
                      display: 'grid',
                      gridTemplateColumns: a.imageUrl ? '160px 1fr' : '1fr',
                      gap: 12
                    }}
                  >
                    {a.imageUrl && (
                      <div className="ar ar-16x9" style={{ borderRadius: 8, overflow: 'hidden' }}>
                        <img
                          src={a.imageUrl}
                          alt={a.imageAlt || a.title || ''}
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div>
                      {/* category chip */}
                      <div style={{ marginBottom: 6 }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 12,
                            border: '1px solid #e5e7eb',
                            background: '#f1f5f9',
                            color: '#475569'
                          }}
                        >
                          {(a.category?.name || a.category || 'General')}
                        </span>
                      </div>

                      <h3 style={{ ...styles.h3, marginBottom: 4 }}>{a.title}</h3>
                      <small style={styles.muted}>
                        {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ''} • {a.author || '—'}
                      </small>
                      <p style={styles.p}>{a.summary}</p>
                    </div>
                  </article>
                </Link>
              ))
            )}
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
