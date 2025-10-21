import { Link } from "react-router-dom";
import "./railSportsV1.css";

function hrefOf(a = {}) {
  return a?.slug ? `/article/${a.slug}` : a?.url || "#";
}

function pickImage(a = {}) {
  // tries common fields you already use across components
  return (
    a.socialImage ||
    a.imageUrl ||
    a.thumb ||
    a.heroImage ||
    a.leadImage ||
    a.ogImage ||
    ""
  );
}

function timeAgo(iso) {
  try {
    const t = new Date(iso).getTime();
    if (!t) return "";
    const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch {
    return "";
  }
}

/**
 * SportsRailV1
 * Simple vertical sports rail with small thumbs and stacked meta.
 * Props from SectionRenderer: { title, items, moreLink, side }
 */
export default function SportsRailV1({
  title = "Sports",
  items = [],
  moreLink = "",
  side = "",
}) {
  return (
    <aside className={`sports-rail-v1 ${side ? `sports-rail-v1--${side}` : ""}`}>
      {title ? <h3 className="sports-rail-v1__title">{title}</h3> : null}

      <div className="sports-rail-v1__list">
        {items.slice(0, 20).map((it, idx) => {
          const img = pickImage(it);
          const href = hrefOf(it);
          const badge = it.badge || it.category || "SPORTS";
          const when = timeAgo(it.publishedAt || it.updatedAt);

          return (
            <article className="sports-rail-v1__item" key={it._id || it.slug || idx}>
              <Link to={href} className="sports-rail-v1__thumbWrap" aria-label={it.title || "story"}>
                {img ? <img className="sports-rail-v1__thumb" src={img} alt={it.title || "thumb"} loading="lazy" /> : <div className="sports-rail-v1__thumb sports-rail-v1__thumb--placeholder" />}
              </Link>
              <div className="sports-rail-v1__meta">
                <div className="sports-rail-v1__badge">{badge}</div>
                <Link to={href} className="sports-rail-v1__headline">
                  {it.title || "Untitled"}
                </Link>
                {when ? <div className="sports-rail-v1__time">{when}</div> : null}
              </div>
            </article>
          );
        })}
      </div>

      {moreLink ? (
        <div className="sports-rail-v1__more">
          <Link to={moreLink} className="sports-rail-v1__moreLink">
            <span aria-hidden>→</span> SEE ALL
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
