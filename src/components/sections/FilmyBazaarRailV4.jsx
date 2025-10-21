// frontend/src/components/sections/FilmyBazaarRailV4.jsx
import { Link } from "react-router-dom";
import "./filmybazaar_v4.css";

/**
 * FilmyBazaar – Rail v4
 * Layout: Heading centered at top, 2x2 grid. Each item shows image (16:9) + title below.
 *
 * Custom (optional, via Section.custom JSON):
 * {
 *   "maxTitleLines": 2,
 *   "gap": 6,            // px between cards (minimal by default)
 *   "cols": 2,
 *   "imageRadius": 0,    // px
 *   "outerRadius": 0,    // px
 *   "innerRadius": 0,    // px
 *   "showMore": false
 * }
 */
export default function FilmyBazaarRailV4({
  section,
  title = "",
  items = [],
  moreLink = "",
  custom = {},
  side = "",
}) {
  const {
    maxTitleLines = 2,
    gap = 6,          // minimal default gap
    cols = 2,
    imageRadius = 0,  // squared images
    outerRadius = 0,  // squared outer container
    innerRadius = 0,  // squared inner container
    showMore = false,
  } = custom || {};

  // v4 is a 2x2 block → default capacity 4
  const capacity = Math.max(1, Number(section?.capacity ?? 4));
  const list = (items || []).slice(0, capacity);

  return (
    <section
      className="fbz4-rail"
      data-side={side || ""}
      style={{
        "--fbz4-gap": `${gap}px`,
        "--fbz4-cols": cols,
        "--fbz4-img-radius": `${imageRadius}px`,
        "--fbz4-outer-radius": `${outerRadius}px`,
        "--fbz4-inner-radius": `${innerRadius}px`,
      }}
    >
      {/* Outer light container */}
      <div className="fbz4-outer">
        {/* Centered heading */}
        <header className="fbz4-header">
          <h3 className="fbz4-title">{title || "MORE ENTERTAINMENT"}</h3>
          {(showMore && moreLink) ? (
            <Link to={moreLink} className="fbz4-more">See all</Link>
          ) : null}
        </header>

        {/* Inner dark container */}
        <div className="fbz4-inner">
          {list.length === 0 ? (
            <div className="fbz4-empty">No items available.</div>
          ) : (
            <div className="fbz4-grid">
              {list.map((a, i) => {
                const key = a?._id || a?.id || a?.slug || i;
                const href = a?.link || `/article/${a?.slug || a?._id || ""}`;
                const img =
                  a?.imageUrl || a?.heroImage || a?.image || a?.thumbnail || "";
                const headline = a?.title || "Untitled";
                return (
                  <article className="fbz4-card" key={key}>
                    <Link to={href} className="fbz4-thumb" aria-label={headline}>
                      {img ? (
                        <img src={img} alt={headline} loading="lazy" />
                      ) : (
                        <span className="fbz4-thumb--ph" />
                      )}
                    </Link>
                    <Link
                      to={href}
                      className="fbz4-headline"
                      style={{ WebkitLineClamp: maxTitleLines }}
                    >
                      {headline}
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
