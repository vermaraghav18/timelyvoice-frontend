import { Link } from "react-router-dom";
import "./railV3.css";

export default function RailV3({ section, title, items = [], moreLink }) {
  // Support both prop shapes: either passed individually or via section
  const label = title || section?.title;
  const list  = items?.length ? items : section?.items || [];

  if (!Array.isArray(list) || list.length === 0) return null;

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

  const linkFor = (a) => (a?.slug ? `/article/${a.slug}` : a?.url || "#");

  return (
    <section className="railv3">
      {label ? <h3 className="railv3__title">{label}</h3> : null}

      <div className="railv3__list">
       {list.slice(0, 7).map((a, idx) => {

          const { src, alt } = pickImg(a);
          const href = linkFor(a);
          return (
            <Link
              key={a.id || a._id || a.slug || idx}
              to={href}
              className="railv3__item"
            >
              {src ? (
                <div className="railv3__thumb">
                  <img src={src} alt={alt} loading="lazy" />
                </div>
              ) : (
                <div className="railv3__thumb railv3__thumb--ph" />
              )}
              <div className="railv3__text">{a.title}</div>
            </Link>
          );
        })}
      </div>

      {(moreLink || section?.moreLink) ? (
        <div className="railv3__more">
          <Link to={moreLink || section.moreLink}>More »</Link>
        </div>
      ) : null}
    </section>
  );
}
