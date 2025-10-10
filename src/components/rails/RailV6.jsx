import { Link } from "react-router-dom";
import "./railV6.css";

function hrefOf(a = {}) {
  return a?.slug ? `/article/${a.slug}` : a?.url || "#";
}

function pickImg(a = {}) {
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
}

export default function RailV6({
  title = "WSJ",
  items = [],
  maxItems = 6,          // lead + up to 5 rows
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const list = items.slice(0, maxItems);
  const lead = list[0];
  const rows = list.slice(1);

  const { src: leadSrc, alt: leadAlt } = pickImg(lead);

  return (
    <aside className="railv6">
      <div className="railv6__head">
        <span className="railv6__title">{title}</span>
      </div>

      {/* Lead: Headline then image */}
      <article className="railv6__lead">
        <h4 className="railv6__leadTitle">
          <Link to={hrefOf(lead)}>{lead?.title}</Link>
        </h4>
        <Link
          to={hrefOf(lead)}
          className="railv6__leadMedia"
          aria-label={lead?.title || "lead"}
        >
          {leadSrc ? (
            <img src={leadSrc} alt={leadAlt} loading="lazy" decoding="async" />
          ) : (
            <div className="railv6__ph" aria-hidden="true" />
          )}
        </Link>
      </article>

      {/* Stack rows: title left, thumb right */}
      <div className="railv6__rows">
        {rows.map((a, idx) => {
          const { src, alt } = pickImg(a);
          return (
            <Link
              key={a.id || a._id || a.slug || idx}
              to={hrefOf(a)}
              className="railv6__row"
            >
              <div className="railv6__rowTitle">{a.title}</div>
              <div className="railv6__rowThumb">
                {src ? (
                  <img src={src} alt={alt} loading="lazy" decoding="async" />
                ) : (
                  <div className="railv6__ph" aria-hidden="true" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
