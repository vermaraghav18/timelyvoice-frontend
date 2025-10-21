import { Link } from "react-router-dom";
import AspectImage from "../AspectImage.jsx";
import "./TopV1.css";

/** Pick best image source from normalized article shape */
function pickImg(a = {}) {
  const cover = a.cover;
  return (
    a.imageUrl ||
    (typeof cover === "string" ? cover : null) ||
    (cover && typeof cover === "object" ? cover.url : null) ||
    ""
  );
}

/* ---------------- Mini card (top strip) ---------------- */
function CardMini({ a, showDate = true }) {
  if (!a) return null;
  return (
    <div className="topv1-mini">
      <Link to={`/article/${a.slug}`} className="topv1-mini-link">
        {showDate && a.publishedAt && (
          <div className="topv1-mini-date">
            {new Date(a.publishedAt).toLocaleDateString()}
          </div>
        )}
        <div className="topv1-mini-title">{a.title}</div>
      </Link>
    </div>
  );
}

/* ---------------- Lead (center-left) ---------------- */
/* ORDER: Title → Image (with badge overlay) → Summary */
function CardLead({ a, showSummary = true, showCategory = true }) {
  if (!a) return null;
  const img = pickImg(a);

  return (
    <article className="topv1-lead">
      {/* Title FIRST */}
      <Link to={`/article/${a.slug}`} className="topv1-lead-title">
        {a.title}
      </Link>

      {/* Image SECOND, with badge overlay in bottom-left */}
      {img ? (
        <div className="topv1-lead-media">
          <AspectImage
            ratio="16/9"
            src={img}
            alt={a.title}
            className="topv1-lead-img"
          />
          {showCategory && a.category ? (
            <Link
              to={`/category/${a.category}`}
              className="topv1-badge topv1-badge-over"
            >
              {a.category}
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Summary LAST */}
      {showSummary && a.summary ? (
        <p className="topv1-lead-summary">{a.summary}</p>
      ) : null}
    </article>
  );
}

/* ---------------- Tall cards (right stack: 2) ---------------- */
function CardTall({ a, showDate = true }) {
  if (!a) return null;
  const img = pickImg(a);
  return (
    <article className="topv1-tall">
      {img && (
        <AspectImage
          ratio="16/9"
          src={img}
          alt={a.title}
          className="topv1-tall-img"
        />
      )}
      <Link to={`/article/${a.slug}`} className="topv1-tall-title">
        {a.title}
      </Link>
      {showDate && a.publishedAt && (
        <div className="topv1-tall-date">
          {new Date(a.publishedAt).toLocaleDateString()}
        </div>
      )}
    </article>
  );
}

/* ---------------- Scrollable list (Fresh / Popular) ---------------- */
function ListCompact({
  items = [],
  title = "",
  showDate = true,
  maxHeight = 220,
  showThumb = false,
  aspect = "1/1",
}) {
  if (!items.length) return null;
  return (
    <aside className="topv1-list" style={{ maxHeight }}>
      {title && <div className="topv1-list-title">{title}</div>}
      <div className="topv1-list-scroll">
        {items.map((a) => {
          const img = showThumb ? pickImg(a) : "";
          return (
            <Link
              key={a.id || a._id || a.slug}
              to={`/article/${a.slug}`}
              className={`topv1-list-item ${showThumb ? "with-thumb" : ""}`}
            >
              {showThumb && img ? (
                <div className="topv1-list-thumb">
                  <AspectImage ratio={aspect} src={img} alt={a.title} />
                </div>
              ) : null}
              <div className="topv1-list-meta">
                <div className="topv1-list-item-title">{a.title}</div>
                {showDate && a.publishedAt && (
                  <div className="topv1-list-item-date">
                    {new Date(a.publishedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

/* ---------------- Main renderer ---------------- */
export default function TopV1({ section, custom = {} }) {
  const zones = custom.zoneItems || {};
  const {
    topStrip = [],
    lead = [],
    rightStack = [],
    freshStories = [],
    popular = [],
  } = zones;

  return (
    <section className="topv1">
      {/* Top 4 strip */}
      <div className="topv1-strip">
        {topStrip.slice(0, 4).map((a) => (
          <CardMini
            key={a.id || a._id || a.slug}
            a={a}
            showDate={custom?.topStrip?.showDate !== false}
          />
        ))}
      </div>

      {/* Main 3-column area */}
      <div className="topv1-main">
        {/* Left list (Fresh stories) */}
        <div className="topv1-col-left">
          <ListCompact
            items={freshStories}
            title={custom?.freshStories?.panelTitle ?? "Fresh stories"}
            showDate={custom?.freshStories?.showDate !== false}
            maxHeight={custom?.freshStories?.maxHeight ?? 520}
            showThumb={custom?.freshStories?.layout === "compact+thumb"}
            aspect="1/1"
          />
        </div>

        {/* Center lead + right stack */}
        <div className="topv1-col-center">
          <CardLead
            a={lead[0]}
            showSummary={custom?.lead?.showSummary !== false}
            showCategory={custom?.lead?.showCategory !== false}
          />
          <div className="topv1-right-stack">
            {rightStack.slice(0, 2).map((a) => (
              <CardTall
                key={a.id || a._id || a.slug}
                a={a}
                showDate={custom?.rightStack?.showDate !== false}
              />
            ))}
          </div>
        </div>

        {/* Right list (Popular) */}
        <div className="topv1-col-right">
          <ListCompact
            items={popular}
            title={custom?.popular?.panelTitle ?? "Popular"}
            showDate={custom?.popular?.showDate !== false}
            maxHeight={custom?.popular?.maxHeight ?? 520}
            showThumb={custom?.popular?.layout === "compact+thumb"}
            aspect="1/1"
          />
        </div>
      </div>
    </section>
  );
}
