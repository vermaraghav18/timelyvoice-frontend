// frontend/src/components/nav/PrimaryNav.jsx
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";

const LINKS = [
  { label: "Home", path: "/" },
  { label: "Top News", path: "/top-news" },

  { label: "India", slug: "india" },
  { label: "World", slug: "world" },
  { label: "Health", path: "/health" },

  { label: "Finance", slug: "finance" },
  { label: "History", slug: "history" },

  { label: "Entertainment", slug: "entertainment" },
  { label: "New Delhi", slug: "new-delhi" },
  { label: "Punjab", slug: "punjab" },
  { label: "General", slug: "general" },
];

/** ✅ Desktop gutters: adjust these two to control left/right gaps */
const NAV_MAX_WIDTH = 1120; // reduce to 980 or 920 if you want more “gap”
const DESKTOP_GUTTER_PX = 18; // increase to 24/30 if you want more “gap”

const WRAP_STYLE = {
  width: "100%",
  background: "#0B3D91",
  color: "#fff",
  borderTop: "1px solid rgba(255,255,255,0.15)",
  borderBottom: "1px solid rgba(0,0,0,0.2)",
  boxSizing: "border-box",
};

/** ✅ NEW: this is what creates the left/right gutters on desktop */
const INNER_STYLE = {
  width: "100%",
  maxWidth: NAV_MAX_WIDTH,
  margin: "0 auto",
  paddingLeft: DESKTOP_GUTTER_PX,
  paddingRight: DESKTOP_GUTTER_PX,
  boxSizing: "border-box",
};

const OUTER_STYLE = {
  width: "100%",
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  margin: 0,
  padding: 0,
};

const SCROLLER_STYLE = {
  width: "100%",
  height: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start", // mobile-first
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-x",
  boxSizing: "border-box",
  margin: 0,
  padding: 0, // ✅ do NOT add edge padding here; INNER_STYLE handles gutters
};

const UL_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  listStyle: "none",
  padding: 0,
  margin: 0,
  flexWrap: "nowrap",
  whiteSpace: "nowrap",
  gap: 0,
};

const LI_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  flex: "0 0 auto",
};

const LINK_BASE = {
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
  letterSpacing: "0.04em",
  padding: "0 12px",
  lineHeight: "44px",
  display: "inline-block",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  borderBottom: "3px solid transparent",
  scrollSnapAlign: "start",
  flex: "0 0 auto",
};

const ACTIVE_DECORATION = {
  color: "#00c3ffff",
  borderBottomColor: "#006effff",
  textShadow: "0 0 0 currentColor",
};

const SEP_STYLE = {
  color: "rgba(255,255,255,0.35)",
  padding: "0 6px",
  lineHeight: "44px",
  userSelect: "none",
  flex: "0 0 auto",
};

function hrefFor(link) {
  if (link.path) return link.path.startsWith("/") ? link.path : `/${link.path}`;
  return `/category/${encodeURIComponent(link.slug)}`;
}

function isActive(link, pathname) {
  if (link.path === "/") return pathname === "/";
  if (link.path) return pathname.startsWith(link.path);
  const catPath = `/category/${encodeURIComponent(link.slug)}`;
  return pathname === catPath || pathname.startsWith(`${catPath}/`);
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

export default function PrimaryNav({ containerStyle }) {
  const { pathname } = useLocation();
  const scrollerRef = useRef(null);
  const activeRef = useRef(null);

  const visibleLabels = useMemo(
    () => [
      "Home",
      "Top News",
      "India",
      "World",
      "Health",
      "Finance",
      "History",
      "Entertainment",
      "New Delhi",
      "Punjab",
      "General",
    ],
    []
  );

  const visibleIndexes = useMemo(
    () =>
      LINKS.map((l, i) => (visibleLabels.includes(l.label) ? i : -1)).filter(
        (i) => i >= 0
      ),
    [visibleLabels]
  );

  const lastVisibleIndex = visibleIndexes.length
    ? visibleIndexes[visibleIndexes.length - 1]
    : -1;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeEl = activeRef.current;
    if (!scroller) return;

    // ✅ Mobile: swipe + keep active tab visible
    if (isMobile()) {
      if (activeEl?.scrollIntoView) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
      return;
    }

    // ✅ Desktop: center active link nicely
    if (activeEl) {
      const elRect = activeEl.getBoundingClientRect();
      const scRect = scroller.getBoundingClientRect();
      const delta =
        (elRect.left + elRect.right) / 2 - (scRect.left + scRect.right) / 2;
      scroller.scrollBy({ left: delta, behavior: "smooth" });
    }
  }, [pathname]);

  return (
    <nav style={WRAP_STYLE} aria-label="Primary">
      <style>{`
        .nav-scroller {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: x mandatory;
        }
        .nav-scroller::-webkit-scrollbar { display: none; }

        .primary-link:hover { opacity: 0.95; }
        .primary-link:focus-visible { outline: 2px solid #1D9A8E55; outline-offset: 2px; }

        /* ✅ Mobile: allow full-bleed swipe feel, but keep small side padding */
        @media (max-width: 768px) {
          .nav-inner {
            max-width: none !important;
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
          .primary-outer { justify-content: flex-start !important; }
          .nav-scroller { justify-content: flex-start !important; overflow-x: auto !important; }
          .primary-list { justify-content: flex-start !important; }
          .primary-link { line-height: 44px; padding: 0 12px; font-size: 13px; }
          .primary-sep { display: none; }
        }

        /* ✅ Desktop: centered row inside gutters */
        @media (min-width: 769px) {
          .nav-scroller { justify-content: center !important; }
          .primary-list { justify-content: center !important; }
        }
      `}</style>

      <div className="nav-inner" style={{ ...INNER_STYLE, ...(containerStyle || {}) }}>
        <div className="primary-outer" style={OUTER_STYLE}>
          <div
            ref={scrollerRef}
            className="nav-scroller"
            style={SCROLLER_STYLE}
            tabIndex={0}
          >
            <ul className="primary-list" style={UL_STYLE}>
              {LINKS.map((l, idx) => {
                const isVisible = visibleLabels.includes(l.label);
                if (!isVisible) return null;

                const href = hrefFor(l);
                const key = l.slug || l.path || l.label;
                const active = isActive(l, pathname);
                const style = active
                  ? { ...LINK_BASE, ...ACTIVE_DECORATION }
                  : LINK_BASE;

                return (
                  <li key={key} style={LI_STYLE}>
                    <Link
                      to={href}
                      style={style}
                      className="primary-link"
                      aria-current={active ? "page" : undefined}
                      ref={active ? activeRef : null}
                    >
                      {l.label}
                    </Link>

                    {idx !== lastVisibleIndex && (
                      <span
                        aria-hidden="true"
                        className="primary-sep"
                        style={SEP_STYLE}
                      >
                        |
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
