// src/components/nav/PrimaryNav.jsx
import { Link } from 'react-router-dom';

// Full set from your dropdown
const LINKS = [
  { label: 'World', slug: 'World' },
  { label: 'Politics', slug: 'Politics' },
  { label: 'Business', slug: 'Business' },
  { label: 'Entertainment', slug: 'Entertainment' },
  { label: 'General', slug: 'General' },
  { label: 'Health', slug: 'Health' },

  { label: 'Science', slug: 'Science' },
  { label: 'Sports', slug: 'Sports' },
  { label: 'Tech', slug: 'Tech' },
];

const WRAP_STYLE = {
  background: '#0B3D91',
  color: '#fff',
  borderTop: '1px solid rgba(255,255,255,0.15)',
  borderBottom: '1px solid rgba(0,0,0,0.2)',
};

const INNER_STYLE = {
  maxWidth: 1120,
  margin: '0 auto',
  padding: '0 12px',
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflowX: 'auto',        // allow horizontal scroll on small screens
  scrollbarWidth: 'thin',
};

const UL_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  listStyle: 'none',
  padding: 0,
  margin: 0,
  flexWrap: 'nowrap',       // keep one row; we scroll instead of wrapping
  whiteSpace: 'nowrap',
};

const LINK_STYLE = {
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
};

const SEP_STYLE = {
  color: 'rgba(255,255,255,0.35)',
  padding: '0 6px',
  lineHeight: '48px',
  userSelect: 'none',
};

export default function PrimaryNav() {
  return (
    <nav style={WRAP_STYLE} aria-label="Primary">
      <div style={INNER_STYLE}>
        <ul style={UL_STYLE}>
          {LINKS.map((l, idx) => (
            <li key={l.slug} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Link
                to={`/category/${encodeURIComponent(l.slug)}`}
                style={LINK_STYLE}
              >
                {l.label}
              </Link>
              {idx < LINKS.length - 1 && (
                <span aria-hidden="true" style={SEP_STYLE}>|</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
