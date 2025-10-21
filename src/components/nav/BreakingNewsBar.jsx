// src/components/nav/BreakingNewsBar.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// Toggle: keep logic, hide UI
const HIDE_BREAKING_NEWS = true;

export default function BreakingNewsBar({ items = [] }) {
  if (HIDE_BREAKING_NEWS) return null; // ← hidden entirely

  const source = Array.isArray(items)
    ? items
        .map(b => ({ text: b.headline || b.text || '', url: b.url || '' }))
        .filter(b => b.text)
    : [];

  if (source.length === 0) return null;

  const measureRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [repeats, setRepeats] = useState(2);

  const strip = useMemo(() => {
    const GAP = 16;
    const itemStyle = { fontWeight: 600, fontSize: 14, lineHeight: 1.1 };
    return (
      <div
        ref={measureRef}
        className="bn-strip"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: GAP,
          whiteSpace: 'nowrap',
          padding: '0 8px',
        }}
      >
        {source.map((b, idx) => (
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
    );
  }, [source]);

  useEffect(() => {
    const measure = () => {
      const el = measureRef.current;
      if (!el) return;
      const cw = el.scrollWidth;
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
      setContentWidth(cw);
      const needed = cw > 0 ? Math.max(2, Math.ceil((vw * 2) / cw)) : 2;
      setRepeats(needed);
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
  }, [source.length]);

  const SPEED = 80; // px/sec
  const durationSec = contentWidth > 0 ? contentWidth / SPEED : 18;

  return (
    <div style={{ width: '100%', background: '#ff0000', color: '#fff' }} aria-live="polite">
      <div
        className="bn-track"
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          lineHeight: 1.1,
          padding: '6px 0',
        }}
      >
        <div
          className="bn-mover"
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            willChange: 'transform',
            animation: contentWidth ? 'bn-marquee var(--bn-duration) linear infinite' : 'none',
            '--bn-shift': contentWidth ? `${contentWidth}px` : '100%',
            '--bn-duration': `${durationSec}s`,
          }}
        >
          {strip}
          {Array.from({ length: repeats }).map((_, i) => (
            <div key={i} className="bn-strip-dup" style={{ display: 'inline-block' }}>
              {strip}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes bn-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-1 * var(--bn-shift))); }
        }
        @media (hover: hover) {
          .bn-track:hover .bn-mover { animation-play-state: paused; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bn-mover { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
