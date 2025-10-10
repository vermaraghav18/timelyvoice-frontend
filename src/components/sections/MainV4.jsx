// frontend/src/components/sections/MainV4.jsx
import { Link } from "react-router-dom";
import "./mainV4.css";

/**
 * MainV4 — "More Headlines" two-column list
 * - Matches list_v1 typographic scale & rhythm
 * - 2 columns × up to 12 items
 * - Thumbnail (16:9) + bold 2-line title + blue byline
 *
 * Width control:
 *   - CSS sets :root { --main-col-width: 650px; } (or whatever you choose)
 *   - You can override per-instance via the `containerMax` prop
 */
export default function MainV4({
  title = "More Headlines",
  items = [],
  containerMax, // optional; if provided, overrides --main-col-width
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const pickImg = (a = {}) => {
    const src =
      a.imageUrl ||
      (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
      a.thumbnailUrl ||
      a.image?.url ||
      a.heroImage?.url ||
      a.featuredImage?.url ||
      a.thumb?.url ||
      a.media?.url ||
      a.enclosure?.url ||
      "";
    const alt =
      a.imageAlt ||
      (typeof a.cover === "object" ? a.cover?.alt : "") ||
      a.title ||
      "image";
    return { src, alt };
  };

  // If containerMax is passed, set the CSS variable inline to override the default
  const widthStyle =
    typeof containerMax === "number"
      ? { ["--main-col-width"]: `${containerMax}px` }
      : undefined;

  return (
    <section className="mainv4 section-full">
      <div className="mainv4__inner" style={widthStyle}>
        <h2 className="mainv4__heading">{title}</h2>

        <div className="mainv4__grid">
          {items.slice(0, 12).map((a, i) => {
            const { src, alt } = pickImg(a);
            const href = a.slug ? `/article/${a.slug}` : a.url || "#";

            return (
              <Link key={a.id || a._id || i} to={href} className="mainv4__row">
                {src ? (
                  <div className="mainv4__thumb">
                    <img src={src} alt={alt} loading="lazy" />
                  </div>
                ) : (
                  <div className="mainv4__thumb mainv4__thumb--ph" />
                )}

                <div className="mainv4__body">
                  <h3 className="mainv4__title">{a.title}</h3>
                  <div className="mainv4__by">{a.author || a.byline || ""}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
