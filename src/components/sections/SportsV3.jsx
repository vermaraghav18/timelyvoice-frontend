// frontend/src/components/sections/SportsV3.jsx
import { Link } from "react-router-dom";
import "./sportsV3.css";

function hrefOf(a = {}) {
  return a?.slug ? `/article/${encodeURIComponent(a.slug)}` : a?.url || "#";
}
function pickImage(a = {}) {
  return (
    a.heroImage ||
    a.socialImage ||
    a.imageUrl ||
    a.leadImage ||
    a.thumb ||
    a.thumbUrl ||
    a.ogImage ||
    ""
  );
}
function pickSummary(a = {}) {
  const raw =
    a.summary ||
    a.excerpt ||
    a.description ||
    a.seoDescription ||
    (typeof a.body === "string" ? a.body.replace(/<[^>]+>/g, "") : "");
  return (raw || "").toString().trim();
}
function fmtDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return "";
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  return d.toLocaleDateString(undefined, opts); // e.g., 02 Aug 2025
}

/**
 * SportsV3 — Horizontal cards (image top, meta chips, title, summary)
 * Props from SectionRenderer: { title, items, moreLink }
 */
export default function SportsV3({
  title = "Breaking News",
  items = [],
  moreLink = "",
}) {
  const cards = Array.isArray(items) ? items : [];

  return (
    <section className="sports-v3">
      <div className="sports-v3__head">
        <h3 className="sports-v3__title">{title}</h3>
        {moreLink ? (
          <Link to={moreLink} className="sports-v3__seeAll">
            See All →
          </Link>
        ) : null}
      </div>

      <div className="sports-v3__grid">
        {cards.map((it, idx) => {
          const img = pickImage(it);
          const href = hrefOf(it);
          const headline = it.title || "Untitled";
          const summary = pickSummary(it);
          const when =
            fmtDate(it.publishedAt || it.updatedAt || it.publishAt || it.createdAt) ||
            "";
          const tag = it.category || it.section || it.badge || "Sports";

          return (
            <article className="sports-v3__card" key={it._id || it.id || it.slug || idx}>
              <Link to={href} className="sports-v3__media" aria-label={headline}>
                {img ? (
                  <img src={img} alt={it.imageAlt || headline} loading="lazy" />
                ) : (
                  <div className="sports-v3__media--placeholder" />
                )}
              </Link>

              <div className="sports-v3__chips">
                <span className="sports-v3__chip">{tag}</span>
                {when ? <span className="sports-v3__chip">{when}</span> : null}
              </div>

              <Link to={href} className="sports-v3__headlineLink">
                <h4 className="sports-v3__headline">{headline}</h4>
              </Link>

              {summary ? <p className="sports-v3__summary">{summary}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
