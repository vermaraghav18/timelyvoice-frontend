// src/components/SidebarMoreForYou.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App.jsx';

const ui = {
  wrap: {
    position: 'sticky',
    top: 100,
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    padding: '0 2px',
    fontFamily: "'Newsreader', serif",
  },
heading: {
  fontSize: 14,
  fontWeight: 900,
  letterSpacing: 0.6,
  borderTop: '2px dotted #d1d5db',
  borderBottom: '2px dotted #d1d5db',
  padding: '6px 0',
  marginBottom: 10,
  color: '#111827',      // ✅ BLACK
  textTransform: 'uppercase',
},

sectionTitle: {
  fontSize: 13,
  fontWeight: 800,       // ✅ bolder
  color: '#1d4ed8',      // ✅ DARK BLUE (same as link blue)
  margin: '8px 0 6px',
  textTransform: 'uppercase',
},

  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  item: {
    display: 'grid',
    gridTemplateColumns: '72px 1fr',
    gap: 10,
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px dotted #e5e7eb',
  },
  thumbWrap: { width: 72, height: 48, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6' },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  title: {
    fontSize: 14.5,
    lineHeight: 1.25,
    fontWeight: 600,
    color: '#111827',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  catLink: { fontSize: 12, color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 },
  link: { textDecoration: 'none', color: 'inherit' },
  empty: { fontSize: 13, color: '#6b7280', padding: '6px 0' },
};

export default function SidebarMoreForYou({ currentSlug }) {
  const [sections, setSections] = useState([]); // [{category:{name,slug}, items:[...]}]
  const [loading, setLoading] = useState(true);

  const cur = useMemo(() => String(currentSlug || '').toLowerCase(), [currentSlug]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        // 1) load all categories
        const cRes = await api.get('/api/categories', { validateStatus: () => true });
        if (!alive) return;

        const cats = Array.isArray(cRes.data) ? cRes.data : [];
        // exclude the currently opened category
        const others = cats.filter((c) => String(c.slug || '').toLowerCase() !== cur);

        // 2) fetch 2 stories per category (in parallel)
        const perCatPromises = others.map(async (c) => {
          const aRes = await api.get(
            `/api/articles?category=${encodeURIComponent(c.name)}&limit=2`,
            { validateStatus: () => true }
            );

          const items = aRes.status === 200 && Array.isArray(aRes.data?.items)
            ? aRes.data.items
            : [];
          return { category: { name: c.name, slug: c.slug }, items };
        });

        const fetched = await Promise.all(perCatPromises);
        if (!alive) return;

        // only keep those that actually have articles
        setSections(fetched.filter((s) => s.items.length > 0));
      } catch (_) {
        if (!alive) return;
        setSections([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [cur]);

  return (
    <aside style={ui.wrap} aria-label="More news for you">
      <div style={ui.heading}>More news for you</div>

      {loading ? (
        <div style={ui.empty}>Loading…</div>
      ) : sections.length === 0 ? (
        <div style={ui.empty}>No suggestions right now.</div>
      ) : (
        sections.map((sec) => (
          <div key={sec.category.slug} style={{ marginBottom: 8 }}>
            <Link to={`/category/${encodeURIComponent(sec.category.slug)}`} style={ui.catLink}>
              <div style={ui.sectionTitle}>{sec.category.name}</div>
            </Link>
            <div style={ui.list}>
              {sec.items.map((a) => {
                const url = `/article/${encodeURIComponent(a.slug)}`;
                const thumb = a.thumbUrl || a.ogImage || a.imageUrl || null;
                return (
                  <div key={a._id || a.id || a.slug} style={ui.item}>
                    <Link to={url} style={ui.link}>
                      <div style={ui.thumbWrap}>
                        {thumb ? (
                          <img src={thumb} alt={a.imageAlt || a.title || ''} style={ui.thumb} loading="lazy" />
                        ) : (
                          <img
                            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                              '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="48"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="12">IMG</text></svg>'
                            )}`}
                            alt=""
                            style={ui.thumb}
                            loading="lazy"
                          />
                        )}
                      </div>
                    </Link>
                    <div>
                      <Link to={url} style={ui.link}>
                        <h4 style={ui.title}>{a.title}</h4>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </aside>
  );
}
