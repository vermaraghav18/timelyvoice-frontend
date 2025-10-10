import { Link } from "react-router-dom";
import "./railV5.css";

// pick image not needed (no thumbs), but we may use title/url and publishedAt

function hrefOf(a = {}) {
  return a?.slug ? `/article/${a.slug}` : a?.url || "#";
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

export default function RailV5({
  title = "THE NEWS FEED",
  items = [],
  moreLink = "",
  // cap here if you want fewer items than section capacity
  maxItems = 8,
}) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <aside className="railv5">
      <h3 className="railv5__title">{title}</h3>

      <div className="railv5__list">
        {items.slice(0, maxItems).map((a, idx) => {
          const href = hrefOf(a);
          const when =
            a.timeAgo ||
            timeAgo(a.publishedAt) ||
            timeAgo(a.updatedAt) ||
            "";
          return (
            <Link
              key={a.id || a._id || a.slug || idx}
              to={href}
              className="railv5__row"
            >
              {when ? <div className="railv5__time">{when}</div> : null}
              <div className="railv5__headline">{a.title}</div>
            </Link>
          );
        })}
      </div>

      {moreLink ? (
        <div className="railv5__more">
          <Link to={moreLink} className="railv5__moreLink">
            <span aria-hidden>→</span> SEE ALL
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
