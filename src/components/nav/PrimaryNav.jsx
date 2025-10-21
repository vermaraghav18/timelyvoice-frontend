import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Top News', path: '/top-news' },
  { label: 'India', slug: 'Politics' },
  { label: 'World', slug: 'World' },
  { label: 'Finance', slug: 'Business' },
  { label: 'FilmyBazaar', slug: 'Entertainment' },
  { label: 'Health', slug: 'Health' },
  { label: 'Sports & Tech', slug: 'Sports' },
];

const WRAP_STYLE = {
  background: '#0B3D91',
  color: '#fff',
  borderTop: '1px solid rgba(255,255,255,0.15)',
  borderBottom: '1px solid rgba(0,0,0,0.2)',
};

const OUTER_STYLE = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '0 12px',
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  overflowX: 'hidden',
  overflowY: 'hidden',
};

const SCROLLER_STYLE = {
  width: '100%',
  height: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  WebkitOverflowScrolling: 'touch',
  touchAction: 'pan-x',
};

const UL_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 0,
  listStyle: 'none',
  padding: 0,
  margin: 0,
  flexWrap: 'nowrap',
  whiteSpace: 'nowrap',
};

const LINK_BASE = {
  color: '#fff',
  textDecoration: 'none',
  fontWeight: 800,
  fontSize: 14,
  letterSpacing: '0.04em',
  padding: '0 14px',
  lineHeight: '48px',
  display: 'inline-block',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  borderBottom: '3px solid transparent',
  scrollSnapAlign: 'start',
};

const ACTIVE_DECORATION = {
  borderBottomColor: '#ffffff',
  textShadow: '0 0 0 currentColor',
};

const SEP_STYLE = {
  color: 'rgba(255,255,255,0.35)',
  padding: '0 6px',
  lineHeight: '48px',
  userSelect: 'none',
};

function hrefFor(link) {
  if (link.path) return link.path.startsWith('/') ? link.path : `/${link.path}`;
  return `/category/${encodeURIComponent(link.slug)}`;
}

function isActive(link, pathname) {
  if (link.path === '/') return pathname === '/';
  if (link.path) return pathname.startsWith(link.path);
  const catPath = `/category/${encodeURIComponent(link.slug)}`;
  return pathname === catPath || pathname.startsWith(`${catPath}/`);
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

export default function PrimaryNav() {
  const { pathname } = useLocation();
  const scrollerRef = useRef(null);
  const activeRef = useRef(null);

  // Make Top News and India visible
  const visibleLabels = ['Top News', 'India'];
  const visibleIndexes = LINKS.map((l, i) => (visibleLabels.includes(l.label) ? i : -1)).filter(i => i >= 0);
  const lastVisibleIndex = visibleIndexes.length ? visibleIndexes[visibleIndexes.length - 1] : -1;

  // On mobile: always start at first tab. Desktop: center active.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeEl = activeRef.current;
    if (!scroller) return;

    if (isMobile()) {
      scroller.scrollTo({ left: 0, behavior: 'auto' });
    } else if (activeEl) {
      const elRect = activeEl.getBoundingClientRect();
      const scRect = scroller.getBoundingClientRect();
      const delta = (elRect.left + elRect.right) / 2 - (scRect.left + scRect.right) / 2;
      scroller.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }, [pathname]);

  return (
    <nav style={WRAP_STYLE} aria-label="Primary">
      <style>{`
        .nav-scroller {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: x proximity;
        }
        .nav-scroller::-webkit-scrollbar { display: none; }

        @media (max-width: 768px) {
          .primary-link { line-height: 44px; padding: 0 12px; font-size: 13px; }
          .primary-sep { display: none; }
        }
      `}</style>

      <div className="primary-outer" style={OUTER_STYLE}>
        <div ref={scrollerRef} className="nav-scroller primary-scroller" style={SCROLLER_STYLE} tabIndex={0}>
          <ul className="primary-list" style={UL_STYLE}>
            {LINKS.map((l, idx) => {
              const isVisible = visibleLabels.includes(l.label);
              const href = hrefFor(l);
              const key = l.slug || l.path || l.label;
              const active = isActive(l, pathname);
              const style = active ? { ...LINK_BASE, ...ACTIVE_DECORATION } : LINK_BASE;

              return (
                <li
                  key={key}
                  style={{
                    display: isVisible ? 'inline-flex' : 'none',
                    alignItems: 'center',
                  }}
                >
                  <Link
                    to={isVisible ? href : '#'}
                    style={isVisible ? style : { ...LINK_BASE, pointerEvents: 'none', cursor: 'default' }}
                    className="primary-link"
                    aria-current={active && isVisible ? 'page' : undefined}
                    aria-hidden={isVisible ? undefined : true}
                    tabIndex={isVisible ? 0 : -1}
                    ref={active && isVisible ? activeRef : null}
                  >
                    {isVisible ? l.label : ''}
                  </Link>

                  {/* separator only if not last visible */}
                  {isVisible && idx !== lastVisibleIndex && (
                    <span aria-hidden="true" className="primary-sep" style={SEP_STYLE}>
                      |
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
