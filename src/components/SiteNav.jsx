// src/components/SiteNav.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../App.jsx';
import TickerBar from './nav/TickerBar.jsx';
import PrimaryNav from './nav/PrimaryNav.jsx';
import BreakingNewsBar from './nav/BreakingNewsBar.jsx';

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia(`(max-width:${breakpoint}px)`).matches : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.('change', onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.('change', onChange);
      mq.removeListener?.(onChange);
    };
  }, [breakpoint]);
  return isMobile;
}

/** Condensed header when scrolled beyond threshold */
function useCondensedHeader(threshold = 64) {
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      setCondensed((prev) => (prev ? y > threshold - 8 : y > threshold + 8));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return condensed;
}

// --- toggle to hide ALL region/city UI while keeping the logic/fetching intact ---
const HIDE_REGION_NAV = true;

export default function SiteNav() {
  const loc = useLocation();
  const isMobile = useIsMobile(768);
  const condensed = useCondensedHeader(70);

  const [dateStr, setDateStr] = useState('');
  const [breaking, setBreaking] = useState([]);

  const [allCats, setAllCats] = useState([]);
  const [regionsOpen, setRegionsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [visibleCount, setVisibleCount] = useState(8);
  const wrapperRef = useRef(null);
  const moreRef = useRef(null);
  const measurerRef = useRef(null);

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    );
  }, [loc.key]);

  useEffect(() => {
    let alive = true;
    api
      .get('/api/breaking', { validateStatus: () => true })
      .then((res) => {
        if (!alive) return;
        const items = Array.isArray(res.data) ? res.data : [];
        setBreaking(items.filter((b) => b?.active !== false));
      })
      .catch(() => alive && setBreaking([]));
    return () => { alive = false; };
  }, [loc.key]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/categories');
        if (!cancelled) setAllCats(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setAllCats([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!isMobile) return;
    const original = document.body.style.overflow;
    if (mobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = original || '';
    return () => { document.body.style.overflow = original || ''; };
  }, [isMobile, mobileMenuOpen]);

  const container = { maxWidth: 1120, margin: '0 auto' };

  const languages = [
    { code: 'en', label: 'ENGLISH', aria: 'English' },
    { code: 'ta', label: 'தமிழ்', aria: 'Tamil' },
    { code: 'gu', label: 'ગુજરાતી', aria: 'Gujarati' },
    { code: 'hi', label: 'हिंदी', aria: 'Hindi' },
    { code: 'mr', label: 'मराठी', aria: 'Marathi' },
  ];
  const langHref = (code) => {
    const sp = new URLSearchParams(loc.search || '');
    sp.set('lang', code);
    const qs = sp.toString();
    return `${loc.pathname}${qs ? `?${qs}` : ''}`;
  };
  const langLinkStyle = { fontSize: 12, fontWeight: 700, lineHeight: 1, textDecoration: 'none', color: '#fff', opacity: 0.95, whiteSpace: 'nowrap' };
  const langSepStyle  = { margin: '0 6px', color: 'rgba(255,255,255,0.6)', fontSize: 12, userSelect: 'none' };

  const chip  = { width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'rgba(255,255,255,0.16)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 11 };
  const ctaBtn= { fontSize: 11, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 1px 0 rgba(0,0,0,0.18)', whiteSpace: 'nowrap' };

  // Regions list (kept for logic, but we won't render anything when HIDE_REGION_NAV = true)
  const regions = useMemo(() => {
    const list = (allCats || []).filter((c) => c?.type === 'state' || c?.type === 'city');
    return list.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
  }, [allCats]);

  const visible  = regions.slice(0, visibleCount);
  const overflow = regions.slice(visibleCount);

  // width-measuring logic remains (no visual output when hidden)
  useEffect(() => {
    if (isMobile) { setVisibleCount(regions.length || 0); return; }
    const GAP = 24;
    if (!measurerRef.current) {
      const m = document.createElement('span');
      Object.assign(m.style, {
        position: 'absolute',
        visibility: 'hidden',
        whiteSpace: 'nowrap',
        fontWeight: '800',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        fontSize: '14px',
        padding: '0',
      });
      document.body.appendChild(m);
      measurerRef.current = m;
    }
    const compute = () => {
      const wrap = wrapperRef.current;
      if (!wrap || !measurerRef.current) return;
      const rowWidth = wrap.clientWidth;
      let used = 0, fit = 0;
      for (let i = 0; i < regions.length; i++) {
        measurerRef.current.textContent = regions[i]?.name || '';
        const w = measurerRef.current.offsetWidth;
        const gap = fit > 0 ? GAP : 0;
        const willHaveOverflow = (i + 1) < regions.length;
        const moreW = willHaveOverflow && moreRef.current ? (moreRef.current.offsetWidth + 12) : 0;
        if (used + gap + w + moreW <= rowWidth) { used += gap + w; fit++; } else { break; }
      }
      const next = regions.length > 0 ? Math.max(1, fit) : 0;
      setVisibleCount(next);
    };
    compute();
    let ro;
    if ('ResizeObserver' in window && wrapperRef.current) {
      ro = new ResizeObserver(() => compute());
      ro.observe(wrapperRef.current);
    }
    const onWin = () => compute();
    window.addEventListener('resize', onWin);
    return () => { window.removeEventListener('resize', onWin); if (ro) ro.disconnect(); };
  }, [regions, isMobile]);

  // --- Mobile full-screen sheet (regions section is hidden when HIDE_REGION_NAV) ---
  const MobileSheet = () => (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      onClick={(e) => { if (e.currentTarget === e.target) setMobileMenuOpen(false); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          background: '#0b1b3d',
          color: '#fff',
          overflowY: 'auto',
          boxSizing: 'border-box',
          paddingTop: 16,
          paddingBottom: 20,
          paddingLeft: 'calc(16px + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(16px + env(safe-area-inset-right, 0px))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <strong style={{ letterSpacing: '0.02em' }}>Menu</strong>
          <button type="button" aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 8, padding: '6px 10px' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Link to="/#newsletter" onClick={() => setMobileMenuOpen(false)} style={{ ...ctaBtn, background: '#001936ff' }}>Daily Updates</Link>
          <Link to="/admin" onClick={() => setMobileMenuOpen(false)} style={{ ...ctaBtn, background: '#008516ff' }}>Sign In</Link>
        </div>

        <div style={{ margin: '10px 0 14px' }}>
          <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 6 }}>Languages</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {languages.map((l) => (
              <Link key={l.code} to={langHref(l.code)} onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none', color: '#fff', fontWeight: 700, fontSize: 12 }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Regions list hidden */}
        {!HIDE_REGION_NAV && (
          <div style={{ marginTop: 8 }}>
            <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 8 }}>Regions</div>
            {regions.length === 0 ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>No regions yet</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {regions.map((r) => (
                  <Link key={r._id} to={`/category/${encodeURIComponent(r.slug)}`} onClick={() => setMobileMenuOpen(false)}
                    style={{ padding: '12px 12px', borderRadius: 12, background: '#0d254f', textDecoration: 'none', color: '#fff' }}>
                    <div style={{ fontWeight: 800, letterSpacing: '0.02em' }}>{r.name}</div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.65, marginTop: 2 }}>{r.type}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ opacity: 0.6, fontSize: 11, marginTop: 16 }}>{dateStr}</div>
      </div>
    </div>
  );

  const topBarStyle = {
    background: 'linear-gradient(90deg, #001431ff 0%, #002c79ff 100%)',
    color: '#fff',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    transition: 'padding 180ms ease, transform 180ms ease',
  };

  const topGridStyle = !isMobile
    ? {
        ...container,
        padding: condensed ? '6px 12px 4px' : '12px 12px 8px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        columnGap: 12,
        transition: 'padding 180ms ease',
      }
    : {
        ...container,
        padding: '8px 10px 10px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        columnGap: 8,
      };

  const logoStyle = !isMobile
    ? {
        display: 'inline-block',
        textDecoration: 'none',
        color: '#fff',
        fontWeight: 900,
        fontSize: condensed ? 26 : 'clamp(22px, 5vw, 40px)',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        lineHeight: 1.1,
        transition: 'font-size 180ms ease',
      }
    : {
        display: 'inline-block',
        textDecoration: 'none',
        color: '#fff',
        fontWeight: 900,
        fontSize: 20,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        lineHeight: 1.1,
      };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
      {/* hide scrollbars for any scroller */}
      <style>{`
        .tv-scrollfade {
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          touch-action: pan-x;
        }
        .tv-scrollfade::-webkit-scrollbar { height: 0; width: 0; background: transparent; }
        .tv-scrollfade::-webkit-scrollbar-thumb { background: transparent; }
        .tv-scrollfade::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* top header */}
      <div style={topBarStyle}>
        {/* Desktop layout with condense-on-scroll */}
        {!isMobile ? (
          <div style={topGridStyle}>
            {/* Left block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 8, opacity: condensed ? 0.9 : 1, transition: 'opacity 180ms ease' }}>
                {['X', 'IG', 'TG', 'YT'].map((t) => (
                  <a key={t} href="#" style={chip} aria-label={t}>{t}</a>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/#newsletter" style={{ ...ctaBtn, background: '#001936ff' }}>GET THE DAILY UPDATES</Link>
                <Link to="/admin" style={{ ...ctaBtn, background: '#008516ff' }}>SIGN IN</Link>
              </div>
            </div>

            {/* Logo */}
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <Link to="/" aria-label="The Timely Voice — Home" style={logoStyle}>
                The Timely Voice
              </Link>
            </div>

            {/* Right: languages + ticker */}
            <nav aria-label="Language selection" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {languages.map((l, i) => (
                  <span key={l.code} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Link to={langHref(l.code)} aria-label={`Switch to ${l.aria}`} style={langLinkStyle}>{l.label}</Link>
                    {i < languages.length - 1 && <span style={langSepStyle}>|</span>}
                  </span>
                ))}
              </div>
              {!condensed && (
                <div style={{ marginTop: 4, width: '100%', maxWidth: 360, transition: 'opacity 180ms ease' }}>
                  <TickerBar />
                </div>
              )}
            </nav>
          </div>
        ) : (
          // Mobile layout
          <div style={topGridStyle}>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              ☰
            </button>

            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <Link to="/" aria-label="The Timely Voice — Home" style={logoStyle}>
                The Timely Voice
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              <Link to="/admin" aria-label="Sign In" style={{ ...chip, width: 36, height: 36 }}>↪</Link>
            </div>

            {/* Ticker under bar */}
            <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
              <TickerBar />
            </div>
          </div>
        )}
      </div>

      {/* main categories (your PrimaryNav already shows only Top News) */}
      <PrimaryNav />

      {/* regions row — completely hidden */}
      { !HIDE_REGION_NAV ? (
        <div style={{ width: '100%', background: ' #001431ff ', color: '#fff', fontSize: 14, userSelect: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div style={{ ...container, padding: isMobile ? '8px 8px' : '0 12px' }}>
            {isMobile ? (
              <div
                className="tv-scrollfade"
                style={{
                  display: 'flex',
                  gap: 10,
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x proximity',
                  padding: '2px 2px 8px',
                  maskImage: 'linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 16px), transparent)',
                }}
              >
                {(regions.length ? regions : []).map((r) => (
                  <Link
                    key={r._id}
                    to={`/category/${encodeURIComponent(r.slug)}`}
                    style={{
                      scrollSnapAlign: 'start',
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.35)',
                      whiteSpace: 'nowrap',
                      textDecoration: 'none',
                      color: '#fff',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      fontSize: 12,
                    }}
                  >
                    {r.name}
                  </Link>
                ))}
                {regions.length === 0 && <span style={{ opacity: 0.85 }}>No regions yet</span>}
              </div>
            ) : (
              <div ref={wrapperRef} style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', gap: 24, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {visible.length === 0 ? (
                    <span style={{ opacity: 0.85 }}>No regions yet</span>
                  ) : (
                    visible.map((r) => (
                      <Link
                        key={r._id}
                        to={`/category/${encodeURIComponent(r.slug)}`}
                        style={{ color: '#fff', textDecoration: 'none', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.02em' }}
                      >
                        {r.name}
                      </Link>
                    ))
                  )}
                </div>

                {overflow.length > 0 && (
                  <div
                    ref={moreRef}
                    style={{ marginLeft: 'auto', position: 'relative' }}
                    onMouseEnter={() => setRegionsOpen(true)}
                    onMouseLeave={() => setRegionsOpen(false)}
                  >
                    <button
                      type="button"
                      onClick={() => setRegionsOpen((v) => !v)}
                      aria-expanded={regionsOpen ? 'true' : 'false'}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6, cursor: 'pointer' }}
                    >
                      More
                      <span style={{ display: 'inline-block', transform: regionsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 120ms ease' }}>▸</span>
                    </button>

                    {regionsOpen && (
                      <div
                        style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, minWidth: 220, maxHeight: 320, overflowY: 'auto', background: '#fff', color: '#111827', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 10px 30px rgba(0,0,0,0.18)', borderRadius: 8, padding: '6px 0', zIndex: 90 }}
                      >
                        {overflow.map((r) => (
                          <Link
                            key={r._id}
                            to={`/category/${encodeURIComponent(r.slug)}`}
                            onClick={() => setRegionsOpen(false)}
                            style={{ display: 'block', padding: '8px 12px', textDecoration: 'none', color: '#111827' }}
                          >
                            {r.name}
                            <span style={{ marginLeft: 8, fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>{r.type}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null }

      {/* edge-to-edge breaking bar */}
      <BreakingNewsBar items={breaking} />

      {isMobile && mobileMenuOpen && <MobileSheet />}
    </header>
  );
}
