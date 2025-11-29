// src/pages/history/timeline/TimelineSection.jsx
import { useEffect, useMemo, useState } from "react";
import "./TimelineSection.css";

export default function TimelineSection({ items, activeIndex, onJumpToIndex }) {
  const [hoverYear, setHoverYear] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Mount flag for intro animation
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Group articles by year
  const yearGroups = useMemo(() => {
    const map = {};
    for (const it of items || []) {
      const year = Number(it.yearBc ?? it.year_bc ?? it.year);
      if (!Number.isFinite(year)) continue;
      if (!map[year]) map[year] = [];
      map[year].push(it);
    }
    return map;
  }, [items]);

  const years = useMemo(
    () =>
      Object.keys(yearGroups)
        .map(Number)
        .sort((a, b) => b - a), // 4000 → 0
    [yearGroups]
  );

  const maxCount = useMemo(() => {
    let m = 1;
    for (const y of years) {
      m = Math.max(m, yearGroups[y].length);
    }
    return m;
  }, [years, yearGroups]);

  if (!years.length) return null;

  const minY = Math.min(...years); // closest to 0 B.C
  const maxY = Math.max(...years); // farthest / oldest
  const range = maxY - minY || 1;

  // Map: 4000 B.C (maxY) → left, 0 B.C (minY) → right.
  const getLeftPercent = (year) => {
    const t = (maxY - year) / range; // 0 → maxY (left), 1 → minY (right)
    return t * 100;
  };

  const hasHover = hoverYear !== null;

  return (
    <div
      className={`tv-timeline ${isMounted ? "is-mounted" : ""} ${
        hasHover ? "has-hover" : ""
      }`}
    >
      {/* main horizontal line */}
      <div className="tv-base-line" />

      {/* ticks */}
      {years.map((year) => {
        const count = yearGroups[year].length;
        const height = 30 + (count / maxCount) * 60; // 30–90px

        const posPercent = getLeftPercent(year);
        const isRightSide = posPercent > 80; // near right edge → flip tooltip
        const isDim = hasHover && hoverYear !== year;

        return (
          <div
            key={year}
            className={`tv-year-tick ${isDim ? "tv-year-tick--dim" : ""}`}
            style={{
              left: `${posPercent}%`,
              height: `${height}px`,
            }}
            onMouseEnter={() => setHoverYear(year)}
            onMouseLeave={() => setHoverYear(null)}
            onClick={() => {
              if (typeof onJumpToIndex === "function") {
                const firstIndex = items.findIndex(
                  (it) =>
                    Number(it.yearBc ?? it.year_bc ?? it.year) === Number(year)
                );
                if (firstIndex !== -1) onJumpToIndex(firstIndex);
              }
            }}
          >
            {hoverYear === year && (
              <div
                className={`tv-tooltip tv-tooltip-show ${
                  isRightSide ? "tv-tooltip--left" : ""
                }`}
              >
                <div className="tv-tooltip-year">{year} B.C</div>
                {yearGroups[year].map((a, idx) => (
                  <div key={idx} className="tv-tooltip-item">
                    {a.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* bottom labels – aligned using same position math */}
      <div
        className="tv-start-label"
        style={{ left: `${getLeftPercent(maxY)}%` }}
      >
        {maxY} B.C
      </div>
      <div
        className="tv-end-label"
        style={{ left: `${getLeftPercent(minY)}%` }}
      >
        {minY} B.C
      </div>
    </div>
  );
}
