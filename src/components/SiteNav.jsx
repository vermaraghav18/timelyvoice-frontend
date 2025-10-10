// src/components/SiteNav.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../App.jsx';
import TickerBar from './nav/TickerBar.jsx';
import PrimaryNav from './nav/PrimaryNav.jsx';
import BreakingNewsBar from './nav/BreakingNewsBar.jsx';

export default function SiteNav() {
  const loc = useLocation();
  const [dateStr, setDateStr] = useState('');
  const [breaking, setBreaking] = useState([]);

  // regions data + UI
  const [allCats, setAllCats] = useState([]);
  const [regionsOpen, setRegionsOpen] = useState(false);

  // auto-fit
  const [visibleCount, setVisibleCount] = useState(8);     // safe default
  const wrapperRef = useRef(null);                         // NEW: the whole row (flex container)
  const moreRef = useRef(null);                            // “More” button box
  const measurerRef = useRef(null);                        // hidden width measurer

  /* ---------- Date ---------- */
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    );
  }, [loc.key]);

  /* ---------- Breaking ---------- */
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

  /* ---------- Load categories ---------- */
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

  const container = { maxWidth: 1120, margin: '0 auto' };

  /* ---------- Languages ---------- */
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

  /* ---------- Tiny styles ---------- */
  const chip  = { width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'rgba(255,255,255,0.16)', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 11 };
  const ctaBtn= { fontSize: 11, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 1px 0 rgba(0,0,0,0.18)', whiteSpace: 'nowrap' };

  /* ---------- Regions list (state + city), newest first ---------- */
  const regions = useMemo(() => {
    const list = (allCats || []).filter((c) => c?.type === 'state' || c?.type === 'city');
    return list.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0)
    );
  }, [allCats]);

  const visible  = regions.slice(0, visibleCount);
  const overflow = regions.slice(visibleCount);

  /* ---------- Auto-fit items into the whole row width ---------- */
  useEffect(() => {
    const GAP = 24; // must match CSS gap

    // create measurer once
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

      // width available for the LEFT items area = whole row minus (space we reserve for More if we’ll need it)
      const rowWidth = wrap.clientWidth;

      // iterate and fit as many as possible
      let used = 0;
      let fit = 0;

      for (let i = 0; i < regions.length; i++) {
        // measure the label
        measurerRef.current.textContent = regions[i]?.name || '';
        const w = measurerRef.current.offsetWidth;

        // reserve gap if not first
        const gap = fit > 0 ? GAP : 0;

        // will there be overflow after we include this one?
        const willHaveOverflow = (i + 1) < regions.length;

        // how much space does the More button need if we’ll have overflow?
        const moreW = willHaveOverflow && moreRef.current ? (moreRef.current.offsetWidth + 12) : 0;

        if (used + gap + w + moreW <= rowWidth) {
          used += gap + w;
          fit++;
        } else {
          break;
        }
      }

      const next = regions.length > 0 ? Math.max(1, fit) : 0;
      setVisibleCount(next);
    };

    // run now and on resize
    compute();

    let ro;
    if ('ResizeObserver' in window && wrapperRef.current) {
      ro = new ResizeObserver(() => compute());
      ro.observe(wrapperRef.current);
    }
    const onWin = () => compute();
    window.addEventListener('resize', onWin);

    return () => {
      window.removeEventListener('resize', onWin);
      if (ro) ro.disconnect();
    };
  }, [regions]);

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
      {/* top header */}
      <div style={{ background: 'linear-gradient(90deg, #001431ff 0%, #002c79ff 100%)', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ ...container, padding: '12px 12px 8px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['X', 'IG', 'TG', 'YT'].map((t) => <a key={t} href="#" style={chip} aria-label={t}>{t}</a>)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/#newsletter" style={{ ...ctaBtn, background: '#001936ff' }}>GET THE DAILY UPDATES</Link>
              <Link to="/admin" style={{ ...ctaBtn, background: '#008516ff' }}>SIGN IN</Link>
            </div>
          </div>

          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <Link to="/" aria-label="The Timely Voice — Home" style={{ display: 'inline-block', textDecoration: 'none', color: '#fff', fontWeight: 900, fontSize: 'clamp(22px, 5vw, 40px)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.1 }}>
              The Timely Voice
            </Link>
          </div>

          <nav aria-label="Language selection" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {languages.map((l, i) => (
                <span key={l.code} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Link to={langHref(l.code)} aria-label={`Switch to ${l.aria}`} style={langLinkStyle}>{l.label}</Link>
                  {i < languages.length - 1 && <span style={langSepStyle}>|</span>}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 4, width: '100%', maxWidth: 360 }}>
              <TickerBar />
            </div>
          </nav>
        </div>
      </div>

      {/* main categories */}
      <PrimaryNav />

      {/* regions row */}
      <div style={{ width: '100%', background: ' #001431ff ', color: '#fff', fontSize: 14, userSelect: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ ...container, padding: '0 12px' }}>
          <div
            ref={wrapperRef}                                    // <<< measure the WHOLE row
            style={{ position: 'relative', height: 36, display: 'flex', alignItems: 'center', gap: 24 }}
          >
            {/* left: visible items */}
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

            {/* right: More */}
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
                        <span style={{ marginLeft: 8, fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>
                          {r.type}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BreakingNewsBar items={breaking} />
    </header>
  );
}
