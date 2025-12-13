// src/components/SidebarCategoryFeed.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/publicApi';

const styles = {
  wrap: {
    position: 'sticky',
    top: 100, // keep visible under your header
    maxHeight: 'calc(100vh - 120px)',
    overflowY: 'auto',
    padding: '0 2px',
    fontFamily: "'Newsreader', serif",
  },
  heading: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.6,
    borderTop: '2px dotted #d1d5db',
    borderBottom: '2px dotted #d1d5db',
    padding: '6px 0',
    marginBottom: 8,
    color: '#111827',
    textTransform: 'uppercase',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'grid',
    gridTemplateColumns: '72px 1fr',
    gap: 10,
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px dotted #e5e7eb',
  },
  thumbWrap: {
    width: 72,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    background: '#f3f4f6',
  },
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
  link: { textDecoration: 'none', color: 'inherit' },
  empty: { fontSize: 13, color: '#6b7280', padding: '6px 0' },
};

export default function SidebarCategoryFeed({
  slug,           // category slug (fallback)
  name,           // category name (preferred for your current backend)
  excludeIds = [],// ids shown in main list (to avoid duplicates)
  limit = 30,
  title = 'More in this section',
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // backend expects category NAME; fall back to slug if name not provided
  const categoryParam = useMemo(() => name || slug, [name, slug]);

  const exclude = useMemo(
    () => new Set((excludeIds || []).filter(Boolean).map(String)),
    [excludeIds]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get(`/api/articles?category=${encodeURIComponent(categoryParam)}&limit=${limit}`, {
        validateStatus: () => true,
      })
      .then((res) => {
        if (!alive) return;

        if (res.status === 200 && Array.isArray(res.data?.items)) {
          const itemsRaw = res.data.items;
          const filtered = itemsRaw.filter((a) => !exclude.has(String(a._id || a.id)));

          // Fallback: if exclusion removes everything (e.g., only one article exists),
          // show the raw results so the sidebar isn't empty.
          const final = filtered.length > 0 ? filtered : itemsRaw;

          setItems(final);
        } else {
          setItems([]);
        }
      })
      .catch(() => {
        if (!alive) return;
        setItems([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [categoryParam, limit, exclude]);

  return (
    <aside style={styles.wrap} aria-label="More stories from this category">
      <div style={styles.heading}>{title}</div>

      {loading ? (
        <div style={styles.empty}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={styles.empty}>No more stories yet.</div>
      ) : (
        <div style={styles.list}>
          {items.map((a) => {
            const url = `/article/${encodeURIComponent(a.slug)}`;
            const thumb = a.thumbUrl || a.ogImage || a.imageUrl || null;

            return (
              <div key={a._id || a.id || a.slug} style={styles.item}>
                <Link to={url} style={styles.link} aria-label={a.title}>
                  <div style={styles.thumbWrap}>
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={a.imageAlt || a.title || ''}
                        style={styles.thumb}
                        loading="lazy"
                      />
                    ) : (
                      <img
                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                          '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="48"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="12">IMG</text></svg>'
                        )}`}
                        alt=""
                        style={styles.thumb}
                        loading="lazy"
                      />
                    )}
                  </div>
                </Link>

                <div>
                  <Link to={url} style={styles.link}>
                    <h4 style={styles.title}>{a.title}</h4>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
