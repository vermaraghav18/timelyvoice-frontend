// src/components/nav/TickerBar.jsx
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../App.jsx';

/**
 * Slim scrolling ticker that matches the search bar width (640px) and
 * is centered under it. Reads active items from GET /api/ticker.
 */
export default function TickerBar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/ticker', { validateStatus: () => true });
        const list = Array.isArray(res.data) ? res.data : [];
        if (!alive) return;
        setItems(list.filter((t) => t?.active !== false));
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    // refresh every 60s so admin changes show up without reload
    const id = setInterval(async () => {
      try {
        const res = await api.get('/api/ticker', { validateStatus: () => true });
        const list = Array.isArray(res.data) ? res.data : [];
        setItems(list.filter((t) => t?.active !== false));
      } catch {}
    }, 60000);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const line = useMemo(() => {
    const visible = items
      .map((t) => ({
        label: (t.label || '').trim(),
        value: (t.value || '').trim(),
      }))
      .filter((t) => t.label && t.value);

    if (!visible.length) return '';
    return visible.map((t) => `${t.label}: ${t.value}`).join('   •   ');
  }, [items]);

  if (loading || !line) return null;

  // ----- styles
  // Match search input wrapper: maxWidth 640 & centered
  const outer = {
    position: 'relative',
    maxWidth: 640,
    margin: '8px auto 0',
    height: 26,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    // a subtle mask to fade edges (optional)
    WebkitMaskImage:
      'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,1) 24px, rgba(0,0,0,1) calc(100% - 24px), rgba(0,0,0,0))',
    maskImage:
      'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,1) 24px, rgba(0,0,0,1) calc(100% - 24px), rgba(0,0,0,0))',
  };

  const belt = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    paddingInline: 10,
    color: '#dbeafe', // light blue to match header theme
    fontSize: 13,
    letterSpacing: '0.02em',
    willChange: 'transform',
  };

  // Speed: longer lines scroll slower; clamp to keep it readable.
  const chars = line.length;
  const seconds = Math.min(40, Math.max(14, Math.round(chars / 8)));

  return (
    <div style={outer} aria-label="market/weather ticker">
      {/* belt A */}
      <div
        style={{
          ...belt,
          animation: `tv-ticker ${seconds}s linear infinite`,
        }}
      >
        {line}
      </div>

      {/* belt B (starts where A ends) */}
      <div
        style={{
          ...belt,
          left: '100%',
          animation: `tv-ticker ${seconds}s linear infinite`,
        }}
      >
        {line}
      </div>

      <style>
        {`
          @keyframes tv-ticker {
            0%   { transform: translateX(0%) }
            100% { transform: translateX(-100%) }
          }
        `}
      </style>
    </div>
  );
}
