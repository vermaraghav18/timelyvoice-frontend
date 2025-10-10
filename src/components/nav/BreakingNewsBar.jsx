// src/components/nav/BreakingNewsBar.jsx
import { Link } from 'react-router-dom';

export default function BreakingNewsBar({ items = [] }) {
  const visible = Array.isArray(items)
    ? items
        .map((b) => ({
          text: b.headline || b.text || '',
          url: b.url || '',
        }))
        .filter((b) => b.text)
    : [];

  if (visible.length === 0) return null;

  // Thinner: reduce vertical padding
  const wrap = {
    maxWidth: 1120,
    margin: '0 auto',
    padding: '4px 12px', // was 8px 16px
    display: 'flex',
    alignItems: 'center',
    gap: 10, // was 12
  };

  // Thinner label: smaller font size & tighter gaps
  const label = {
    display: 'flex',
    alignItems: 'center',
    gap: 6, // was 8
    color: '#fff',
    fontWeight: 800,
    fontSize: 12, // was 12
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: 1.1,
  };

  const track = {
    position: 'relative',
    overflow: 'hidden',
    flex: '1 1 auto',
    minWidth: 0,
    lineHeight: 1.1, // keeps row compact
  };

  // Keep your existing animation; only the layout/size changed
  const belt = {
    display: 'inline-flex',
    gap: 32, // slightly tighter spacing between items (was 40)
    whiteSpace: 'nowrap',
    willChange: 'transform',
    animation: 'breaking-left 18s linear infinite',
  };

  // Smaller ticker text
  const itemStyle = {
    fontWeight: 500,
    fontSize: 15, // reduce from previous visual (likely ~14px)
    lineHeight: 1.1,
  };

  return (
    <div style={{ background: '#ff0000ff', color: '#fff' }}>
      <div style={wrap}>
        <div style={label}>
    
        </div>

        <div style={track}>
          <div style={belt}>
            {visible.concat(visible).map((b, idx) => (
              <span key={idx} style={itemStyle}>
                {b.url ? (
                  <Link to={b.url} style={{ color: '#fff', textDecoration: 'underline' }}>
                    {b.text}
                  </Link>
                ) : (
                  b.text
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* keyframes local to this component */}
      <style>{`
        @keyframes breaking-left {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
