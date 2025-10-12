import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Top News', path: '/top-news' },
  { label: 'India', slug: 'Politics' },
  { label: 'Global', slug: 'World' },
  { label: 'Business', slug: 'Business' },
  { label: 'Entertainment', slug: 'Entertainment' },
  { label: 'General', slug: 'General' },
  { label: 'Health', slug: 'Health' },
  { label: 'Sports', slug: 'Sports' },
  { label: 'Tech', slug: 'Tech' },
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

  // On mobile: always start at the first tab. Desktop: center active.
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
              const href = hrefFor(l);
              const key = l.slug || l.path || l.label;
              const active = isActive(l, pathname);
              const style = active ? { ...LINK_BASE, ...ACTIVE_DECORATION } : LINK_BASE;

              return (
                <li key={key} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Link
                    to={href}
                    style={style}
                    className="primary-link"
                    aria-current={active ? 'page' : undefined}
                    ref={active ? activeRef : null}
                  >
                    {l.label}
                  </Link>
                  {idx < LINKS.length - 1 && <span aria-hidden="true" className="primary-sep" style={SEP_STYLE}>|</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
