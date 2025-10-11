// src/components/nav/PrimaryNav.jsx
import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Top News', path: '/top-news' },
  { label: 'Global', slug: 'World' },
  { label: 'Politics', slug: 'Politics' },
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

/**
 * Outer container: NO scrollbars here.
 * We’ll place a child “scroller” div that can scroll horizontally
 * but with scrollbars visually hidden.
 */
const OUTER_STYLE = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '0 12px',
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflowX: 'hidden',
  overflowY: 'hidden',
};

/**
 * This inner scroller is the horizontal overflow area.
 * We hide scrollbars across browsers via CSS (class .nav-scroller).
 */
const SCROLLER_STYLE = {
  width: '100%',
  height: '100%',
  overflowX: 'auto',
  overflowY: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const UL_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  borderBottom: '3px solid transparent', // active indicator baseline
};

const ACTIVE_DECORATION = {
  borderBottomColor: '#ffffff', // active tab underline
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
  // Home
  if (link.path === '/') return pathname === '/';

  // Explicit paths (e.g., /top-news)
  if (link.path) return pathname.startsWith(link.path);

  // Category pages
  const catPath = `/category/${encodeURIComponent(link.slug)}`;
  return pathname === catPath || pathname.startsWith(`${catPath}/`);
}

export default function PrimaryNav() {
  const { pathname } = useLocation();

  return (
    <nav style={WRAP_STYLE} aria-label="Primary">
      {/* Inline CSS just to hide scrollbars on the scroller, cross-browser */}
      <style>{`
        .nav-scroller {
          scrollbar-width: none;       /* Firefox */
          -ms-overflow-style: none;    /* IE/Edge legacy */
        }
        .nav-scroller::-webkit-scrollbar {
          display: none;               /* Chrome/Safari */
        }
      `}</style>

      <div style={OUTER_STYLE}>
        <div className="nav-scroller" style={SCROLLER_STYLE}>
          <ul style={UL_STYLE}>
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
                    aria-current={active ? 'page' : undefined}
                  >
                    {l.label}
                  </Link>
                  {idx < LINKS.length - 1 && (
                    <span aria-hidden="true" style={SEP_STYLE}>|</span>
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
