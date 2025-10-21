// frontend/src/components/sections/FilmyBazaarRailV1.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./filmybazaar.css";

/**
 * Vertical rail with animated heading + smooth, slower FLIP reordering.
 * - First card moves to bottom on an interval
 * - Others slide up with a long ease and speed-lines accent
 * - Auto-rotation pauses on hover
 */
export default function FilmyBazaarRailV1({
  section,
  title = "",
  items = [],
  moreLink = "",
  custom = {},
  side = "",
}) {
  const {
    showThumbnail = true,
    showBadges = false,
    showMeta = false,
    maxTitleLines = 2,
    rotateSeconds = 1.0,      // ⬅ slower default cadence
    moveDurationMs = 100,    // ⬅ slower motion per swap
  } = custom || {};

  const capacity = Math.max(1, Number(section?.capacity ?? items?.length ?? 8));
  const initial = useMemo(() => (items || []).slice(0, capacity), [items, capacity]);

  const [vis, setVis] = useState(initial);
  useEffect(() => {
    setVis((prev) => {
      const next = (items || []).slice(0, capacity);
      if (prev.length !== next.length) return next;
      const prevKeys = prev.map((x) => x?._id || x?.id || x?.slug || x?.title);
      const nextKeys = next.map((x) => x?._id || x?.id || x?.slug || x?.title);
      return prevKeys.join("|") === nextKeys.join("|") ? prev : next;
    });
  }, [items, capacity]);

  const heading = title || "FilmyBazaar";

  // Refs for FLIP + interval
  const nodeMapRef = useRef(new Map());
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // One rotation step with FLIP
  const rotateOnce = () => {
    if (!vis || vis.length < 2) return;

    const start = new Map();
    vis.forEach((item) => {
      const key = item?._id || item?.id || item?.slug || item?.title;
      const el = nodeMapRef.current.get(key);
      if (el) start.set(key, el.getBoundingClientRect());
    });

    const next = [...vis.slice(1), vis[0]];
    setVis(next);

    // FLIP apply
    requestAnimationFrame(() => {
      const end = new Map();
      next.forEach((item) => {
        const key = item?._id || item?.id || item?.slug || item?.title;
        const el = nodeMapRef.current.get(key);
        if (el) end.set(key, el.getBoundingClientRect());
      });

      next.forEach((item) => {
        const key = item?._id || item?.id || item?.slug || item?.title;
        const el = nodeMapRef.current.get(key);
        const s = start.get(key);
        const e = end.get(key);
        if (!el || !s || !e) return;

        const dy = s.top - e.top;
        if (dy) {
          el.classList.add("moving"); // enables speed-lines
          el.style.transform = `translateY(${dy}px)`;
          el.style.transition = "none";
          el.getBoundingClientRect(); // reflow
          el.style.transition = `transform ${moveDurationMs}ms cubic-bezier(.22,.72,.18,1.0)`;
          el.style.transform = "translateY(0)";
          const onDone = () => {
            el.classList.remove("moving");
            el.style.transition = "";
            el.style.transform = "";
            el.removeEventListener("transitionend", onDone);
          };
          el.addEventListener("transitionend", onDone);
        }
      });
    });
  };

  // Start/stop interval helpers
  const startTimer = () => {
    const ms = Math.max(2000, Number(rotateSeconds) * 1000);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!hovered) rotateOnce();
    }, ms);
  };
  const stopTimer = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  // Set up interval (and refresh when timing/vis changes)
  useEffect(() => {
    startTimer();
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotateSeconds, vis.length, hovered]);

  return (
    <section
      className="fbz-rail"
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <header className="fbz-rail__header">
        {/* Animated heading (letter-by-letter) */}
        <h3 className="fbz-rail__title" aria-label={heading}>
          {heading.split("").map((ch, i) => (
            <span
              key={i}
              className="fbz-char"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </h3>

        {moreLink ? (
          <Link to={moreLink} className="fbz-rail__more">
            See all
          </Link>
        ) : null}
      </header>

      <div className="fbz-rail__inner">
        <div className="fbz-rail__grid">
          {vis.length === 0 ? (
            <div className="fbz-rail__empty">No items available.</div>
          ) : (
            vis.map((a, idx) => {
              const key = a?._id || a?.id || a?.slug || a?.title || idx;
              return (
                <Card
                  key={key}
                  nodeRef={(el) => {
                    if (el) nodeMapRef.current.set(key, el);
                    else nodeMapRef.current.delete(key);
                  }}
                  a={a}
                  showThumbnail={showThumbnail}
                  showBadges={showBadges}
                  showMeta={showMeta}
                  maxTitleLines={maxTitleLines}
                />
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function Card({ nodeRef, a = {}, showThumbnail, showBadges, showMeta, maxTitleLines }) {
  const href = a?.link || `/article/${a.slug || a._id || ""}`;
  const img = a?.imageUrl || a?.heroImage || a?.image || "";
  const title = a?.title || "Untitled";
  const cat = Array.isArray(a?.categories) ? a.categories[0] : a?.category;

  return (
    <article className="fbz-card" ref={nodeRef}>
      {showThumbnail && img ? (
        <Link to={href} className="fbz-card__thumb">
          <img src={img} alt={title} loading="lazy" />
        </Link>
      ) : null}

      <div className="fbz-card__body">
        <Link
          to={href}
          className="fbz-card__headline"
          style={{ WebkitLineClamp: maxTitleLines }}
        >
          {title}
        </Link>

        {showBadges && cat ? (
          <div className="fbz-card__badges">
            <span className="fbz-badge">{String(cat)}</span>
          </div>
        ) : null}

        {showMeta ? (
          <div className="fbz-card__meta">
            {a?.author ? <span className="fbz-meta__author">{a.author}</span> : null}
            {a?.publishedAt ? <span className="fbz-meta__dot">•</span> : null}
            {a?.publishedAt ? (
              <time dateTime={a.publishedAt}>
                {new Date(a.publishedAt).toLocaleDateString()}
              </time>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
