import { Link } from "react-router-dom";
import "./railV4.css";

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

const hrefFor = (a = {}) => (a.slug ? `/article/${a.slug}` : a.url || "#");

export default function RailV4({
  title = "Popular",
  items = [],
  moreLink = "",
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <aside className="railv4">
      <h3 className="railv4__title">{title}</h3>

      <div className="railv4__list">
        {items.slice(0, 4).map((a, idx) => {
          const { src, alt } = pickImg(a);
          const href = hrefFor(a);
          const rank = idx + 1;
          return (
            <Link
              key={a.id || a._id || a.slug || idx}
              to={href}
              className="railv4__card"
            >
              <div className="railv4__thumb">
                {src ? (
                  <img src={src} alt={alt} loading="lazy" />
                ) : (
                  <div className="railv4__thumb railv4__thumb--ph" />
                )}

                {/* Rank badge – top-left by default */}
                <span className="railv4__rank">{rank}</span>
                {/* If you prefer top-right, use:
                    <span className="railv4__rank railv4__rank--right">{rank}</span>
                */}
              </div>

              <div className="railv4__text">{a.title}</div>
            </Link>
          );
        })}
      </div>

      {moreLink ? (
        <div className="railv4__more">
          <Link to={moreLink}>More »</Link>
        </div>
      ) : null}
    </aside>
  );
}
