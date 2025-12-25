// frontend/src/components/SiteNav.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import PrimaryNav from "./nav/PrimaryNav.jsx";
import BreakingNewsBar from "./nav/BreakingNewsBar.jsx";

// ✅ IMPORTANT: do NOT import from App.jsx (it bloats public chunks)
import { api, cachedGet } from "../lib/publicApi.js";

// --- toggle to hide ALL region/city UI (and now also skips fetching categories) ---
const HIDE_REGION_NAV = true;

/* ✅ RAIL GUTTER SETTINGS (must match CategoryPage rails) */
const RAIL_WIDTH = 120;
const RAIL_GAP = 14;
const RAIL_GUTTER = RAIL_WIDTH + RAIL_GAP;
const NAV_EXTRA_GUTTER = 15; // ✅ make header/nav shorter (increase if needed)
const RAILS_MIN_WIDTH = 1280;

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width:${breakpoint}px)`).matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
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
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return condensed;
}

export default function SiteNav() {
  const loc = useLocation();
  const isMobile = useIsMobile(768);
  const condensed = useCondensedHeader(70);

  // ✅ wide desktop detection (same breakpoint as rails)
  const [isWideForRails, setIsWideForRails] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(min-width:${RAILS_MIN_WIDTH}px)`).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(min-width:${RAILS_MIN_WIDTH}px)`);
    const onChange = (e) => setIsWideForRails(e.matches);
    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  const [dateStr, setDateStr] = useState("");
  const [breaking, setBreaking] = useState([]);

  const [allCats, setAllCats] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const wrapperRef = useRef(null);
  const moreRef = useRef(null);
  const measurerRef = useRef(null);

  // ✅ date string does not need refetch logic; just update on route change
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    );
  }, [loc.pathname, loc.search]);

  // ✅ Breaking news: cached (fast + fewer network hits)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await cachedGet("/breaking", {}, 15_000);
        if (!alive) return;
        const items = Array.isArray(data) ? data : [];
        setBreaking(items.filter((b) => b?.active !== false));
      } catch {
        if (alive) setBreaking([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loc.pathname, loc.search]);

  // ✅ If region nav is hidden, do NOT fetch categories at all.
  useEffect(() => {
    if (HIDE_REGION_NAV) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/categories", { validateStatus: () => true });
        if (!cancelled) setAllCats(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!cancelled) setAllCats([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!isMobile) return;
    const original = document.body.style.overflow;
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = original || "";
    return () => {
      document.body.style.overflow = original || "";
    };
  }, [isMobile, mobileMenuOpen]);

  /**
   * Full bleed container now.
   */
  const container = { width: "100%" };

  // Regions list (only meaningful when region nav is enabled)
  const regions = useMemo(() => {
    if (HIDE_REGION_NAV) return [];
    const list = (allCats || []).filter(
      (c) => c?.type === "state" || c?.type === "city"
    );
    return list.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0)
    );
  }, [allCats]);

  const visible = regions.slice(0, visibleCount);
  const overflow = regions.slice(visibleCount);

  // width-measuring logic (kept, but no-op if regions hidden)
  useEffect(() => {
    if (HIDE_REGION_NAV) return;

    if (isMobile) {
      setVisibleCount(regions.length || 0);
      return;
    }
    const GAP = 24;

    if (!measurerRef.current) {
      const m = document.createElement("span");
      Object.assign(m.style, {
        position: "absolute",
        visibility: "hidden",
        whiteSpace: "nowrap",
        fontWeight: "800",
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        fontSize: "14px",
        padding: "0",
      });
      document.body.appendChild(m);
      measurerRef.current = m;
    }

    const compute = () => {
      const wrap = wrapperRef.current;
      if (!wrap || !measurerRef.current) return;
      const rowWidth = wrap.clientWidth;
      let used = 0,
        fit = 0;

      for (let i = 0; i < regions.length; i++) {
        measurerRef.current.textContent = regions[i]?.name || "";
        const w = measurerRef.current.offsetWidth;
        const gap = fit > 0 ? GAP : 0;
        const willHaveOverflow = i + 1 < regions.length;
        const moreW =
          willHaveOverflow && moreRef.current
            ? moreRef.current.offsetWidth + 12
            : 0;

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

    compute();
    let ro;
    if ("ResizeObserver" in window && wrapperRef.current) {
      ro = new ResizeObserver(() => compute());
      ro.observe(wrapperRef.current);
    }
    const onWin = () => compute();
    window.addEventListener("resize", onWin);
    return () => {
      window.removeEventListener("resize", onWin);
      if (ro) ro.disconnect();
    };
  }, [regions, isMobile]);

  // --- Mobile full-screen sheet (regions stays hidden when HIDE_REGION_NAV) ---
  const MobileSheet = () => (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      onClick={(e) => {
        if (e.currentTarget === e.target) setMobileMenuOpen(false);
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          background: "#0b1b3d",
          color: "#fff",
          overflowY: "auto",
          boxSizing: "border-box",
          paddingTop: 16,
          paddingBottom: 20,
          paddingLeft: "calc(16px + env(safe-area-inset-left, 0px))",
          paddingRight: "calc(16px + env(safe-area-inset-right, 0px))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <strong style={{ letterSpacing: "0.02em" }}>Menu</strong>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.35)",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          >
            ✕
          </button>
        </div>

        {!HIDE_REGION_NAV && (
          <div style={{ marginTop: 8 }}>
            <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 8 }}>
              Regions
            </div>
            {regions.length === 0 ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>No regions yet</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {regions.map((r) => (
                  <Link
                    key={r._id}
                    to={`/category/${encodeURIComponent(r.slug)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      padding: "12px 12px",
                      borderRadius: 12,
                      background: "#0d254f",
                      textDecoration: "none",
                      color: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 800, letterSpacing: "0.02em" }}>
                      {r.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        opacity: 0.65,
                        marginTop: 2,
                      }}
                    >
                      {r.type}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ opacity: 0.6, fontSize: 11, marginTop: 16 }}>
          {dateStr}
        </div>
      </div>
    </div>
  );

  const topBarStyle = {
    background: "linear-gradient(90deg, #001431ff 0%, #002c79ff 100%)",
    color: "#fff",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    transition: "padding 180ms ease, transform 180ms ease",
  };

  // ✅ Desktop top grid (now includes wide-rail gutters)
  const topGridStyle = !isMobile
    ? {
        width: "100%",
        padding: condensed
          ? `6px ${isWideForRails ? RAIL_GUTTER : 12}px 4px`
          : `12px ${isWideForRails ? RAIL_GUTTER : 12}px 8px`,
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        columnGap: 12,
        transition: "padding 180ms ease",
        boxSizing: "border-box",
      }
    : {
        width: "100%",
        padding: "8px 10px 10px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        columnGap: 8,
        boxSizing: "border-box",
      };

  // ✅ UPDATED: smaller logo text (desktop + mobile)
  const logoStyle = !isMobile
    ? {
        display: "inline-block",
        textDecoration: "none",
        color: "#fff",
        fontWeight: 900,
        fontSize: condensed ? 20 : "clamp(18px, 3.2vw, 30px)",
        letterSpacing: "0.02em",
        textTransform: "capitalize",
        lineHeight: 1.05,
        transition: "font-size 180ms ease",
      }
    : {
        display: "inline-block",
        textDecoration: "none",
        color: "#fff",
        fontWeight: 900,
        fontSize: 20,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
        lineHeight: 1.05,
      };

  // ✅ UPDATED: smaller badge (padding/border/shadow reduced)
  const logoBadgeCommon = {
    background: "linear-gradient(130deg, #008080 0%, #00aaaaff 100%)",
    color: "#fff",
    border: "2px solid #000",
    padding: "4px 10px",
    borderRadius: "1px",
    display: "inline-block",
    boxShadow: "6px 8px 0 #000",
  };

  // ✅ wrapper creates empty left/right space for vertical banners at top
  const railWrapperStyle =
    !isMobile && isWideForRails
      ? {
          width: "100%",
          paddingLeft: RAIL_GUTTER + NAV_EXTRA_GUTTER,
          paddingRight: RAIL_GUTTER + NAV_EXTRA_GUTTER,
          boxSizing: "border-box",
        }
      : { width: "100%" };

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50 }}>
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

        .tv-nav-shell{
          width: 100%;
          max-width: none;
          margin: 0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        }
      `}</style>

      {/* ✅ this wrapper creates the gutters on desktop wide screens */}
      <div style={railWrapperStyle}>
        <div className="tv-nav-shell">
          <div style={topBarStyle}>
            {!isMobile ? (
              <div style={topGridStyle}>
                {/* LEFT AREA */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                  }}
                />

                {/* Logo */}
                {/* Logo */}
<div style={{ textAlign: "center", minWidth: 0 }}>
  <div
    style={{
      position: "relative",
      display: "inline-block",
      transform: "translateX(-135px)", // ✅ shift left (change -40px to what you want)
    }}
  >

                    <Link
                      to="/"
                      aria-label="The Timely Voice — Home"
                      style={{
                        ...logoStyle,
                        ...logoBadgeCommon,
                        position: "relative",
                        zIndex: 2,
                      }}
                    >
                      The Timely Voice
                    </Link>

                    {/* ✅ UPDATED: smaller Google News badge */}
                    <div
                      style={{
                        position: "absolute",
                        right: "-38px",
                        top: "70%",
                        transform: "translateY(-50%) rotate(3deg)",
                        background: "#ffffff",
                        borderRadius: "8px",
                        border: "2px solid #000",
                        boxShadow: "5px 6px 0 #000",
                        padding: "3px",
                        zIndex: 3,
                      }}
                    >
                      <img
                        src="/images/google-news.png"
                        alt="Google News"
                        style={{
                          display: "block",
                          width: "34px",
                          height: "auto",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT AREA */}
               {/* RIGHT AREA – Languages (inactive for now) */}
              {/* RIGHT AREA – Languages (inactive for now) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start", // 👈 pull closer to logo
                  gap: 8,                        // 👈 tighter spacing
                  marginLeft: "-94px",           // 👈 IMPORTANT: brings block closer
                  whiteSpace: "nowrap",
                }}
              >
                {/* Vertical separator */}
                <span
                  style={{
                    width: "1px",
                    height: "18px",              // 👈 shorter line
                    background: "rgba(255,255,255,0.5)", // 👈 lighter line
                    display: "inline-block",
                  }}
                />

                {/* Languages */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,                     // 👈 closer words
                    fontSize: 12,                // 👈 slightly smaller
                    fontWeight: 500,             // 👈 MUCH less bold
                    letterSpacing: "0.04em",     // 👈 reduced spacing
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.75)", // 👈 softer
                    cursor: "default",
                    userSelect: "none",
                  }}
                >
                  <span>English</span>
                  <span>Hindi</span>
                  <span>Punjabi</span>
                </div>
              </div>


              </div>
            ) : (
              <div style={topGridStyle}>
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setMobileMenuOpen(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.18)",
                  }}
                >
                  ☰
                </button>

                <div style={{ textAlign: "center", minWidth: 0 }}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <Link
                      to="/"
                      aria-label="The Timely Voice — Home"
                      style={{
                        ...logoStyle,
                        ...logoBadgeCommon,
                        position: "relative",
                        zIndex: 2,
                      }}
                    >
                      The Timely Voice
                    </Link>

                    {/* ✅ UPDATED: smaller Google News badge (mobile) */}
                    <div
                      style={{
                        position: "absolute",
                        right: "-32px",
                        top: "70%",
                        transform: "translateY(-50%) rotate(3deg)",
                        background: "#ffffff",
                        borderRadius: "8px",
                        border: "2px solid #000",
                        boxShadow: "5px 6px 0 #000",
                        padding: "3px",
                        zIndex: 3,
                      }}
                    >
                      <img
                        src="/images/google-news.png"
                        alt="Google News"
                        style={{
                          display: "block",
                          width: "28px",
                          height: "auto",
                          pointerEvents: "none",
                          userSelect: "none",
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    justifyContent: "flex-end",
                  }}
                />
              </div>
            )}
          </div>

          {/* ✅ IMPORTANT: do NOT override PrimaryNav containerStyle (it prevents gutters) */}
          <PrimaryNav />

          {/* regions row — hidden */}
          {!HIDE_REGION_NAV ? (
            <div
              style={{
                width: "100%",
                background: " #001431ff ",
                color: "#fff",
                fontSize: 14,
                userSelect: "none",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  ...container,
                  padding: isMobile ? "8px 8px" : "0 12px",
                }}
              />
            </div>
          ) : null}

          <BreakingNewsBar items={breaking} />

          {isMobile && mobileMenuOpen && <MobileSheet />}
        </div>
      </div>
    </header>
  );
}
