// src/pages/public/HealthPage.jsx
import { useEffect, useState } from 'react';
import { api, styles, removeManagedHeadTags, upsertTag } from '../../App.jsx';
import SiteNav from '../../components/SiteNav.jsx';
import SiteFooter from '../../components/SiteFooter.jsx';
import { ensureRenderableImage } from '../../lib/images';

const SITE_NAME = 'NewsSite';

export default function HealthPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error

  useEffect(() => {
    let cancel = false;

    async function loadHealth() {
      try {
        setStatus('loading');

        const res = await api.get('/articles', {
          params: {
            page: 1,
            limit: 40,
            category: 'Health', // backend already supports this param
          },
          validateStatus: () => true,
        });

        if (cancel) return;

        const list = Array.isArray(res.data?.items) ? res.data.items : [];
        setItems(list);
        setStatus('ok');
      } catch (e) {
        if (!cancel) {
          setItems([]);
          setStatus('error');
        }
      }
    }

    // basic SEO
    removeManagedHeadTags();
    upsertTag('title', {}, { textContent: `Health News — ${SITE_NAME}` });
    upsertTag('meta', {
      name: 'description',
      content: 'Latest articles and explainers on health, kidneys, diabetes, heart, and wellness.',
    });

    loadHealth();

    return () => {
      cancel = true;
    };
  }, []);

  const containerStyle = {
    maxWidth: 1120,
    margin: '0 auto',
    padding: '16px 12px 32px',
  };

  const headingStyle = {
    color: '#ffffff',
    fontSize: 'clamp(22px, 2.4vw, 28px)',
    fontWeight: 800,
    margin: '8px 0 16px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const subtitleStyle = {
    color: '#cbd5f5',
    fontSize: 15,
    marginBottom: 20,
  };

  const listStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const cardStyle = {
    ...styles.card,
    padding: 16,
    background: '#02122f',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
    gap: 16,
    alignItems: 'stretch',
  };

  const mobileCardStyle = {
    ...cardStyle,
    gridTemplateColumns: '1fr',
  };

  const titleStyle = {
    fontSize: 'clamp(18px, 2vw, 22px)',
    fontWeight: 700,
    marginBottom: 8,
    color: '#fff',
  };

  const summaryStyle = {
    fontSize: 15,
    lineHeight: 1.6,
    color: '#e5ecff',
  };

  const bylineStyle = {
    fontSize: 13,
    marginTop: 10,
    color: '#9fb4ff',
  };

  const updatedStyle = {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  };

  const imgWrap = {
    borderRadius: 2,
    overflow: 'hidden',
    background: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const pillStyle = {
    display: 'inline-block',
    background: '#ff5252',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 768px)').matches
    : false;

  function formatDate(v) {
    if (!v) return '';
    try {
      return new Date(v).toLocaleString();
    } catch {
      return '';
    }
  }

  function pickByline(a) {
    const author = (a.author ?? '').toString().trim();
    const source = (a.source ?? '').toString().trim();
    if (author) return author;
    if (source && source.toLowerCase() !== 'automation') return source;
    return 'News Desk';
  }

  return (
    <>
      <SiteNav />

      <main id="content" style={containerStyle}>
        <h1 style={headingStyle}>Health</h1>
        <p style={subtitleStyle}>
          In-depth explainers and updates on kidneys, diabetes, heart health, and everyday wellness.
        </p>

        {status === 'loading' && (
          <div style={{ color: '#e5ecff', padding: '8px 0' }}>Loading health stories…</div>
        )}

        {status === 'error' && (
          <div style={{ color: 'salmon', padding: '8px 0' }}>
            Couldn&apos;t load health stories. Please try again in a moment.
          </div>
        )}

        {status === 'ok' && items.length === 0 && (
          <div style={{ color: '#e5ecff', padding: '8px 0' }}>
            No health stories yet. Publish an article in the Health category to see it here.
          </div>
        )}

        {items.length > 0 && (
          <div style={listStyle}>
            {items.map((a) => {
              const href = `/article/${a.slug}`;
              const img = ensureRenderableImage(a);
              const updatedAt = a.updatedAt || a.publishedAt || a.publishAt || a.createdAt;

              return (
                <a
                  key={a._id || a.id || a.slug}
                  href={href}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <article style={isMobile ? mobileCardStyle : cardStyle}>
                    {/* left: text */}
                    <div>
                      <div style={pillStyle}>Health</div>
                      <h2 style={titleStyle}>{a.title}</h2>
                      {a.summary && <p style={summaryStyle}>{a.summary}</p>}

                      <div style={bylineStyle}>The Timely Voice · {pickByline(a)}</div>
                      {updatedAt && (
                        <div style={updatedStyle}>Updated {formatDate(updatedAt)}</div>
                      )}
                    </div>

                    {/* right: image */}
                    {img && (
                      <div style={imgWrap}>
                        <img
                          src={img}
                          alt={a.imageAlt || a.title || ''}
                          loading="lazy"
                          decoding="async"
                          width="640"
                          height="360"
                          style={imgStyle}
                        />
                      </div>
                    )}
                  </article>
                </a>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
