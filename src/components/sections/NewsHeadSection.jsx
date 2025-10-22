// frontend/src/components/sections/NewsHeadSection.jsx
import { Link } from "react-router-dom";
import "./newsHead.css";

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function excerpt(text = "", max = 160) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

function readCategory(cat) {
  if (!cat) return "";
  return typeof cat === "string" ? cat : cat.name || "";
}

export default function NewsHeadSection({
  title,
  items = [],
  moreLink = "",
  // NOTE: containerScale no longer used to cap width (it caused clipping on small screens)
  containerScale = 1,
}) {
  const lead = items[0] || null;
  const rightItems = items.slice(1, 10); // up to 9 on the right
  const bottomItems = items.slice(10, 12); // up to 2 below the lead

  const Thumb = ({ a, className = "nh-thumb" }) => {
    if (!a) return null;
    const src =
      a.imageUrl ||
      (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
      a.thumbnailUrl ||
      a.image?.url ||
      "";
    const alt =
      a.imageAlt ||
      (typeof a.cover === "object" ? a.cover?.alt : "") ||
      a.title ||
      "image";
    return (
      <div className={className}>
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`${className}-ph`} aria-hidden="true" />
        )}
      </div>
    );
  };

  const CardSmall = ({ a }) =>
    a ? (
      <Link to={`/article/${a.slug}`} className="nh-card-small">
        <Thumb a={a} />
        <div className="nh-small-title">{a.title}</div>
      </Link>
    ) : null;

  const CardMini = ({ a }) =>
    a ? (
      <Link to={`/article/${a.slug}`} className="nh-card-mini">
        {readCategory(a.category) ? (
          <div className="nh-mini-badge">{readCategory(a.category)}</div>
        ) : null}
        <div className="nh-mini-title">{a.title}</div>
        <div className="nh-mini-time">{formatTime(a.publishedAt)}</div>
      </Link>
    ) : null;

  return (
    // IMPORTANT: make the container fluid; no fixed maxWidth here.
    <section className="nh-wrap">
      <div className="nh-header">
        <h2 className="nh-title">{title}</h2>
        {moreLink ? (
          <Link to={moreLink} className="nh-more">
            More {title} »
          </Link>
        ) : null}
      </div>

      {/* Layout */}
      <div className="nh-grid">
        {/* Lead + minis */}
        <div className="nh-left">
          {lead ? (
            <article className="nh-lead">
              <h3 className="nh-lead-headline">
                <Link to={`/article/${lead.slug}`}>{lead.title}</Link>
              </h3>

              <Link
                to={`/article/${lead.slug}`}
                className="nh-lead-media"
                aria-label={lead.title || "lead"}
              >
                {lead.imageUrl || lead.cover || lead.thumbnailUrl || lead.image ? (
                  <img
                    src={
                      lead.imageUrl ||
                      (typeof lead.cover === "string" ? lead.cover : lead.cover?.url) ||
                      lead.thumbnailUrl ||
                      lead.image?.url
                    }
                    alt={
                      lead.imageAlt ||
                      (typeof lead.cover === "object" ? lead.cover?.alt : "") ||
                      lead.title ||
                      "lead image"
                    }
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="nh-lead-ph" aria-hidden="true" />
                )}
              </Link>

              {lead.summary ? (
                <p className="nh-lead-summary">{excerpt(lead.summary, 180)}</p>
              ) : null}

              <div className="nh-lead-meta">
                {formatTime(lead.publishedAt)}
                {lead.author ? <> • {lead.author}</> : null}
                {readCategory(lead.category) ? <> • {readCategory(lead.category)}</> : null}
              </div>
            </article>
          ) : (
            <div className="nh-lead nh-skel" />
          )}

          <div className="nh-bottom-left">
            {bottomItems.map((a, idx) => (
              <CardMini a={a} key={a?.id || a?._id || a?.slug || `mini-${idx}`} />
            ))}
          </div>
        </div>

        {/* Right column → rendered as grid by CSS */}
        <div className="nh-right">
          {rightItems.map((a, idx) => (
            <CardSmall a={a} key={a?.id || a?._id || a?.slug || idx} />
          ))}
        </div>
      </div>
    </section>
  );
}