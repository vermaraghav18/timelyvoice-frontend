// src/pages/history/HistoryPage.jsx
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { api } from "../../App";
import "./HistoryPage.css";
import TimelineSection from "./timeline/TimelineSection";

const ERA_BUCKETS = [
  { id: "4000-3000", label: "4000BC – 3000BC", min: 4000, max: 3001 },
  { id: "3000-2000", label: "3000BC – 2000BC", min: 3000, max: 2001 },
  { id: "2000-1000", label: "2000BC – 1000BC", min: 2000, max: 1001 },
  { id: "1000-0", label: "1000BC – 0BC", min: 1000, max: 0 },
];

function getEraBucket(yearBc) {
  // yearBc is expected as positive number "years before 0" (e.g. 3500 = 3500BC)
  const y = Number(yearBc);
  if (!Number.isFinite(y)) return null;

  for (const b of ERA_BUCKETS) {
    if (y <= b.min && y >= b.max) return b.id;
  }
  return null;
}

// Helper to derive a nice year label from an item
function getYearLabelFromItem(item) {
  if (!item) return "";
  if (item.yearLabel) return item.yearLabel;

  const rawYear = item.yearBc ?? item.year_bc ?? item.year;
  if (rawYear == null) return "";

  return `${rawYear} BC`;
}

/* ============================================================
   YEAR INDEX SECTION (BOTTOM) – 500 YEAR BANDS
   ============================================================ */

// helper to read numeric year
function getNumericYearFromItem(item) {
  if (!item) return null;
  const raw = item.yearBc ?? item.year_bc ?? item.year;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// build 500-year bands from 4000 → 1
function buildYearBands() {
  const GLOBAL_MAX = 4000;
  const GLOBAL_MIN = 1;
  const STEP = 500;

  const bands = [];
  for (let start = GLOBAL_MAX; start >= GLOBAL_MIN; start -= STEP) {
    const end = Math.max(start - STEP + 1, GLOBAL_MIN);
    bands.push({
      id: `${start}-${end}`,
      label: `${start} - ${end} BC`,
      min: start,
      max: end,
    });
  }
  return bands;
}

function YearIndexSection({ items, onJumpToIndex }) {
  const groupsWithYears = useMemo(() => {
    const bands = buildYearBands();
    const map = {};

    bands.forEach((g) => {
      map[g.id] = new Set();
    });

    for (const it of items || []) {
      const y = getNumericYearFromItem(it);
      if (!y) continue;

      const bucket = bands.find((g) => y <= g.min && y >= g.max);
      if (bucket) {
        map[bucket.id].add(y);
      }
    }

    // Convert Sets to sorted arrays (descending: 4000 → 1) and remove empty bands
    return bands
      .map((g) => {
        const yearsArr = Array.from(map[g.id] || []).sort((a, b) => b - a);
        return { ...g, years: yearsArr };
      })
      .filter((g) => g.years.length > 0);
  }, [items]);

  if (!items?.length || !groupsWithYears.length) return null;

  const handleYearClick = (year) => {
    if (typeof onJumpToIndex !== "function") return;
    const idx = items.findIndex(
      (it) => getNumericYearFromItem(it) === year
    );
    if (idx !== -1) {
      onJumpToIndex(idx);
    }
  };

  return (
    <section className="history-year-index-section">
      <h2 className="history-year-index-title">Years you&apos;ve added</h2>

      {groupsWithYears.map((group) => (
        <div key={group.id} className="history-year-index-row">
          <div className="history-year-index-heading">{group.label}</div>
          <div className="history-year-index-years">
            {group.years.map((year) => (
              <button
                key={year}
                type="button"
                className="history-year-index-year"
                onClick={() => handleYearClick(year)}
              >
                {year} BC
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/* ============================================================
   ROTATING CARD COMPONENT (ONLY FOR ERA SIDEBARS)
   With random delay per card change (2s–4s)
   ============================================================ */
function EraRotatingCard({ items }) {
  const list = items.length ? items : [];
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!list.length) return;

    let cancelled = false;
    let outerTimeoutId;
    let animTimeoutId;

    const ANIM_DURATION = 450; // ms
    const MIN_DELAY = 2000; // 2s
    const MAX_DELAY = 4000; // 4s

    const scheduleNext = () => {
      if (cancelled || !list.length) return;

      const delay =
        MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY); // random 2–4s

      outerTimeoutId = setTimeout(() => {
        if (cancelled) return;
        setAnimating(true);

        // after animation, change card and schedule next
        animTimeoutId = setTimeout(() => {
          if (cancelled) return;
          setIndex((i) => (i + 1) % list.length);
          setAnimating(false);
          scheduleNext();
        }, ANIM_DURATION);
      }, delay);
    };

    scheduleNext();

    return () => {
      cancelled = true;
      if (outerTimeoutId) clearTimeout(outerTimeoutId);
      if (animTimeoutId) clearTimeout(animTimeoutId);
    };
  }, [list.length]);

  const item = list[index] || {};

  return (
    <div className="era-rotating-card slide-wrapper">
      <div className={`slide-card ${animating ? "slide-out" : "slide-in"}`}>
        <div className="era-rot-img">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} />
          ) : (
            <div className="era-rot-placeholder">IMAGE</div>
          )}
        </div>

        <div className="era-rot-bottom">
          <div className="era-rot-divider" />
          <div className="era-rot-title">
            {item.title || "TITLE WILL BE HERE"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState("asc"); // asc: 4000→0, desc: 0→4000
  const [error, setError] = useState("");

  // Text shown in the top bar on the right
  const [currentYearLabel, setCurrentYearLabel] = useState(
    "4000BC – 0BC Timeline"
  );

  // Which article is currently "active" in the center list
  const [activeIndex, setActiveIndex] = useState(0);

  // Ref to the scrollable list in the center
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("/history-page", {
          params: { sort: sortMode },
        });

        const data = res?.data || {};
        const list = Array.isArray(data.items) ? data.items : [];

        if (!cancelled) {
          setItems(list);
        }
      } catch (e) {
        console.error("Failed to load history timeline", e);
        if (!cancelled) {
          setItems([]);
          setError("Unable to load history timeline right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sortMode]);

  // When items change, default year label & active index to the first item
  useEffect(() => {
    if (items.length) {
      setActiveIndex(0);
      const label = getYearLabelFromItem(items[0]);
      setCurrentYearLabel(label || "4000BC – 0BC Timeline");
    } else {
      setActiveIndex(0);
      setCurrentYearLabel("4000BC – 0BC Timeline");
    }
  }, [items]);

  // Group items into the four era buckets based on year
  const grouped = useMemo(() => {
    const base = {
      "4000-3000": [],
      "3000-2000": [],
      "2000-1000": [],
      "1000-0": [],
    };

    for (const item of items) {
      // Prefer explicit bucket if backend sends it
      const explicitBucket = item.eraBucket || item.rangeId;
      const bucketId =
        explicitBucket || getEraBucket(item.yearBc ?? item.year_bc ?? item.year);

      if (bucketId && base[bucketId]) {
        base[bucketId].push(item);
      }
    }

    return base;
  }, [items]);

  // Fake "recently viewed" for now: first four items.
  const recentItems = useMemo(() => items.slice(0, 4), [items]);

  const handleToggleSort = () => {
    setSortMode((m) => (m === "asc" ? "desc" : "asc"));
  };

  // Scroll center list to a given article index (used by TimelineSection and YearIndexSection)
  const scrollToIndex = useCallback((index) => {
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll(".timeline-card");
    const target = cards[index];
    if (!target) return;

    const containerRect = listRef.current.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top;

    listRef.current.scrollTo({
      top: listRef.current.scrollTop + offset,
      behavior: "smooth",
    });
  }, []);

  // When list scrolls, update the top bar's year and active index
  const handleListScroll = () => {
    if (!listRef.current || !items.length) return;

    const containerTop = listRef.current.getBoundingClientRect().top;
    const cards = listRef.current.querySelectorAll(".timeline-card");
    if (!cards.length) return;

    let closestIdx = 0;
    let closestDist = Infinity;

    cards.forEach((card, idx) => {
      const rect = card.getBoundingClientRect();
      const dist = Math.abs(rect.top - containerTop);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    const item = items[closestIdx];
    if (!item) return;

    const label = getYearLabelFromItem(item) || "4000BC – 0BC Timeline";

    setActiveIndex((prev) => (prev === closestIdx ? prev : closestIdx));
    setCurrentYearLabel((prev) => (prev === label ? prev : label));
  };

  return (
    <div className="history-page">
      {/* HEADER */}
      <header className="history-header">
        <button
          type="button"
          className="history-sort-toggle"
          onClick={handleToggleSort}
        >
          <span className="history-sort-label">
            Sort: {sortMode === "asc" ? "4000BC → 0BC" : "0BC → 4000BC"}
          </span>
          <span className="history-sort-pill">
            {sortMode === "asc" ? "Old → New" : "New → Old"}
          </span>
        </button>
      </header>

      {/* TOP TIMELINE GRID */}
      <section className="history-top-card">
        <div className="history-top-header">
          <span className="history-top-caption">
            Current Year You’re Reading:
          </span>
          <span className="history-top-year">{currentYearLabel}</span>
        </div>

        <div className="history-top-grid">
          {/* LEFT COLUMN: 4000–3000 + 3000–2000 stacked */}
          <div className="history-left-stacked">
            <EraColumn
              title="Articles related to:"
              eraLabel={ERA_BUCKETS[0].label}
              items={grouped["4000-3000"]}
            />
            <EraColumn
              title="Articles related to:"
              eraLabel={ERA_BUCKETS[1].label}
              items={grouped["3000-2000"]}
            />
          </div>

          {/* CENTER COLUMN – main vertical list (scrolls inside) */}
          <div
            className="history-main-column"
            ref={listRef}
            onScroll={handleListScroll}
          >
            {(items.length ? items : Array.from({ length: 4 })).map(
              (item, idx) => (
                <TimelineItemCard
                  key={item?.id || `skeleton-${idx}`}
                  item={item}
                  skeleton={!item}
                />
              )
            )}
          </div>

          {/* RIGHT COLUMN 2000–1000  + 1000–0 – same design as left */}
          <div className="history-side-stacked">
            <EraSideBlock
              title="Articles related to:"
              eraLabel={ERA_BUCKETS[2].label}
              items={grouped["2000-1000"]}
            />
            <EraSideBlock
              title="Articles related to:"
              eraLabel={ERA_BUCKETS[3].label}
              items={grouped["1000-0"]}
            />
          </div>
        </div>
      </section>

      {/* RECENTLY VIEWED SECTION */}
      <section className="history-section">
        <div className="history-section-header">
          <h2 className="history-section-title">
            Articles related to: <span>What you recently viewed</span>
          </h2>
        </div>

        <div className="history-recent-grid">
          {(recentItems.length ? recentItems : Array.from({ length: 4 })).map(
            (item, idx) => (
              <RecentItemCard
                key={item?.id || `recent-skeleton-${idx}`}
                item={item}
                skeleton={!item}
              />
            )
          )}
        </div>
      </section>

      {/* CHOOSE SPECIFIC YEAR SECTION */}
      <section className="history-year-section">
        <h2 className="history-year-title">Choose a Specific Year Range</h2>

        <div className="history-year-grid">
          {ERA_BUCKETS.map((bucket) => (
            <button
              key={bucket.id}
              className="history-year-card"
              type="button"
            >
              <div className="history-year-label">{bucket.label}</div>
              <div className="history-year-desc">
                All the events from this range that you’ve added / uploaded.
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 🔥 INTERACTIVE TIMELINE (NEW) */}
      {items.length > 0 && (
        <TimelineSection
          items={items}
          activeIndex={activeIndex}
          onJumpToIndex={scrollToIndex}
        />
      )}

      {/* YEAR INDEX LIST (500-year bands) */}
      {items.length > 0 && (
        <YearIndexSection items={items} onJumpToIndex={scrollToIndex} />
      )}

      {loading && (
        <div className="history-status history-status-loading">
          Loading timeline…
        </div>
      )}
      {!loading && error && (
        <div className="history-status history-status-error">{error}</div>
      )}
      {!loading && !error && !items.length && (
        <div className="history-status">No history articles found yet.</div>
      )}
    </div>
  );
}

/* --- Sub-components ------------------------------------------------------ */

function TimelineItemCard({ item, skeleton }) {
  if (skeleton) {
    return (
      <article className="timeline-card timeline-card-skeleton">
        <div className="timeline-text">
          <div className="timeline-title-skeleton" />
          <div className="timeline-meta-skeleton" />
        </div>
        <div className="timeline-image-skeleton" />
      </article>
    );
  }

  const title = item?.title || "Untitled article";
  const image = item?.imageUrl || item?.thumbnail;
  const yearLabel = getYearLabelFromItem(item);
  const eraLabel = item?.eraLabel || "";

  return (
    <article className="timeline-card">
      {/* LEFT SIDE — TEXT */}
      <div className="timeline-text">
        <h3 className="timeline-title">{title}</h3>
        <div className="timeline-meta">
          {yearLabel && <span className="timeline-pill">{yearLabel}</span>}
          {eraLabel && (
            <span className="timeline-pill timeline-pill-outline">
              {eraLabel}
            </span>
          )}
        </div>
      </div>

      {/* RIGHT SIDE — IMAGE */}
      <div className="timeline-image-wrapper">
        {image ? (
          <img
            src={image}
            alt={title}
            className="timeline-image"
            loading="lazy"
          />
        ) : (
          <div className="timeline-image-placeholder">IMAGE</div>
        )}
      </div>
    </article>
  );
}

/* LEFT ERA COLUMN – uses rotating card */
function EraColumn({ title, eraLabel, items }) {
  return (
    <div className="era-column">
      <div className="era-column-header">
        <span className="era-caption">{title}</span>
        <span className="era-label">{eraLabel}</span>
      </div>

      <EraRotatingCard items={items} />
    </div>
  );
}

/* RIGHT ERA BLOCK – same structure as left */
function EraSideBlock({ title, eraLabel, items }) {
  return (
    <div className="era-column">
      <div className="era-column-header">
        <span className="era-caption">{title}</span>
        <span className="era-label">{eraLabel}</span>
      </div>

      <EraRotatingCard items={items} />
    </div>
  );
}

function RecentItemCard({ item, skeleton }) {
  if (skeleton) {
    return (
      <article className="recent-card recent-card-skeleton">
        <div className="recent-image-skeleton" />
        <div className="recent-title-skeleton" />
      </article>
    );
  }

  const title = item?.title || "Title will be here";
  const image = item?.imageUrl || item?.thumbnail;

  return (
    <article className="recent-card">
      <div className="recent-image-wrapper">
        {image ? (
          <img
            src={image}
            alt={title}
            className="recent-image"
            loading="lazy"
          />
        ) : (
          <div className="recent-image-placeholder">IMAGE</div>
        )}
      </div>

      {/* divider between image and title */}
      <div className="recent-divider" />

      <h3 className="recent-title">{title}</h3>
    </article>
  );
}
