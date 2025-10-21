// frontend/src/components/sections/FilmyBazaarRailV3.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./filmybazaar_v3.css";

/**
 * FilmyBazaar – Rail v3 (Deck, image-only)
 * - Transparent; no chrome
 * - Always shows the admin title at the top (no container background)
 */
export default function FilmyBazaarRailV3({
  section,
  title = "",
  items = [],
  moreLink = "",
  custom = {},
  side = "",
}) {
  const {
    visible = 5,
    rotateSeconds = 2.5,
    cardWidth = 140,
    cardHeight = 180,
    fanAngle = 12,
    spread = 26,
    borderRadius = 12,
  } = custom || {};

  const capacity = Math.max(1, Number(section?.capacity ?? items?.length ?? 8));
  const baseList = useMemo(() => (items || []).slice(0, capacity), [items, capacity]);

  const list = useMemo(
    () =>
      baseList
        .map((a) => ({
          key:
            a?._id ||
            a?.id ||
            a?.slug ||
            a?.link ||
            a?.imageUrl ||
            Math.random().toString(36),
          href: a?.link || `/article/${a?.slug || a?._id || ""}`,
          img: a?.imageUrl || a?.heroImage || a?.image || a?.thumbnail || "",
        }))
        .filter((x) => !!x.img),
    [baseList]
  );

  const N = Math.min(Math.max(1, visible), Math.max(1, list.length));
  const [deck, setDeck] = useState(() => list.slice(0, N));

  useEffect(() => {
    setDeck(list.slice(0, N));
  }, [list, N]);

  const rotate = () => {
    if (deck.length < 2) return;
    setDeck((prev) => [...prev.slice(1), prev[0]]);
  };

  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const ms = Math.max(300, Number(rotateSeconds) * 1000);
    const id = setInterval(() => {
      if (!hovered) rotate();
    }, ms);
    return () => clearInterval(id);
  }, [rotateSeconds, hovered, deck.length]);

  const mid = (N - 1) / 2;

  const styleVars = {
    ["--w"]: `${cardWidth}px`,
    ["--h"]: `${cardHeight}px`,
    ["--angle"]: `${fanAngle}deg`,
    ["--spread"]: `${spread}px`,
    ["--radius"]: `${borderRadius}px`,
  };

  const hasTitle = String(title || "").trim().length > 0;

  return (
    <section
      className="fbz3-rail fbz3-rail--transparent"
      data-side={side || ""}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={styleVars}
    >
      {/* Inline title (no background) */}
      {hasTitle && (
        <div className="fbz3-title-inline">
          <h3 className="fbz3-title-text">{title}</h3>
          {moreLink ? (
            <Link className="fbz3-more" to={moreLink} aria-label="See all">
              •••
            </Link>
          ) : null}
        </div>
      )}

      <div className="fbz3-stage fbz3-stage--bare">
        {deck.map((c, i) => {
          const offset = i - mid;
          const rotateZ = offset * fanAngle;
          const translateX = offset * spread;
          const z = i + 1;
          return (
            <Link
              key={c.key}
              to={c.href}
              className="fbz3-card"
              style={{
                transform: `translateX(${translateX}px) rotate(${rotateZ}deg)`,
                zIndex: z,
              }}
              aria-label="open"
            >
              <img src={c.img} alt="" loading="lazy" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
