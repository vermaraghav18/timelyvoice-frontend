// frontend/src/components/sections/FilmyBazaarRailV2.jsx
import { Link } from "react-router-dom";
import "./filmybazaar_v2.css";

/**
 * FilmyBazaar – Rail v2
 * - Top orange gradient bar with section title
 * - Vertical list: Title (left) + Image (right)
 */
export default function FilmyBazaarRailV2({
  section,
  title = "",
  items = [],
  moreLink = "",
  custom = {},
  side = "",
}) {
  // NOTE: Do NOT set defaults here; let CSS control defaults.
  const maxTitleLines = custom?.maxTitleLines ?? 2;
  const imageWidth = custom?.imageWidth; // undefined unless provided
  const gap = custom?.gap;               // undefined unless provided
  const showDividers = custom?.showDividers ?? true;

  const capacity = Math.max(1, Number(section?.capacity ?? items?.length ?? 6));
  const list = (items || []).slice(0, capacity);
  const heading = title || "Section";

  return (
    <section
      className="fbz2-rail"
      data-dividers={showDividers ? "1" : "0"}
      data-side={side || ""}
    >
      {/* Top gradient bar */}
      <div className="fbz2-topbar">
        <h3 className="fbz2-title">{heading}</h3>
        {moreLink ? (
          <Link to={moreLink} className="fbz2-more" aria-label="See all">
            •••
          </Link>
        ) : null}
      </div>

      {/* Items */}
      <div className="fbz2-list">
        {list.length === 0 ? (
          <div className="fbz2-empty">No items available.</div>
        ) : (
          list.map((a, i) => {
            const key = a?._id || a?.id || a?.slug || i;
            const href = a?.link || `/article/${a?.slug || a?._id || ""}`;
            const img =
              a?.imageUrl || a?.heroImage || a?.image || a?.thumbnail || "";

            // Only apply variables if provided so CSS defaults can win
            const styleVars = {};
            if (imageWidth != null) styleVars["--img-w"] = `${imageWidth}px`;
            if (gap != null) styleVars["--gap"] = `${gap}px`;

            return (
              <article key={key} className="fbz2-row" style={styleVars}>
                <div className="fbz2-left">
                  <Link
                    to={href}
                    className="fbz2-headline"
                    style={{ WebkitLineClamp: maxTitleLines }}
                  >
                    {a?.title || "Untitled"}
                  </Link>
                </div>
                <div className="fbz2-right">
                  {img ? (
                    <Link to={href} className="fbz2-thumb" aria-label={a?.title || ""}>
                      <img src={img} alt={a?.title || ""} loading="lazy" />
                    </Link>
                  ) : (
                    <Link
                      to={href}
                      className="fbz2-thumb fbz2-thumb--placeholder"
                      aria-label={a?.title || ""}
                    />
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
