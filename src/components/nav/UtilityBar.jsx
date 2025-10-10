// src/components/nav/UtilityBar.jsx
import { Link } from 'react-router-dom';

export default function UtilityBar() {
  const wrap = { maxWidth: 1120, margin: '0 auto' };

  return (
    <div style={{ background: 'linear-gradient(90deg, #00317aff 0%, #001b4bff 100%)', color: '#fff' }}>
      <div
        style={{
          ...wrap,
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 34,
        }}
      >
        {/* Socials (subtle) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.9 }}>
          <span style={{ fontSize: 12, opacity: 0.9, display: 'none' }}>Follow:</span>
          {['X', 'IG', 'TG', 'YT'].map((t) => (
            <a
              key={t}
              href="#"
              style={{
                width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 999, background: 'rgba(255,255,255,0.16)', color: '#fff',
                textDecoration: 'none', fontWeight: 800, fontSize: 11,
              }}
              aria-label={t}
            >
              {t}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            to="/#newsletter"
            style={{
              fontSize: 11, fontWeight: 700, color: '#fff', textDecoration: 'none',
              background: '#1f7ae0', padding: '6px 10px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.18)',
              whiteSpace: 'nowrap',
            }}
          >
            GET THE DAILY UPDATES
          </Link>
          <Link
            to="/admin"
            style={{
              fontSize: 11, fontWeight: 700, color: '#fff', textDecoration: 'none',
              background: '#2E7D32', padding: '6px 10px', borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 1px 0 rgba(0,0,0,0.18)',
              whiteSpace: 'nowrap',
            }}
          >
            SIGN IN
          </Link>
        </div>
      </div>
    </div>
  );
}
