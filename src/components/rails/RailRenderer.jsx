// frontend/src/components/rails/RailRenderer.jsx
import { Link } from "react-router-dom";

/**
 * RailRenderer
 * Renders a single rail block (right/left column).
 *
 * section = {
 *   _id, key, title, type|template, side, order,
 *   query, config, ui, items: [...]
 * }
 */
export default function RailRenderer({ section }) {
  if (!section) return null;

  // prefer 'type', fallback 'template', default 'list_v1' and normalize (hyphen -> underscore)
  const rawKind = section.type ?? section.template ?? "list_v1";
  const kind = String(rawKind).toLowerCase().replace(/-/g, "_");

  const title = section.title || "";
  const items = Array.isArray(section.items) ? section.items : [];
  const config = section.config || {};
  const ui = section.ui || {};

  // ---------- PROMO (IMAGE-ONLY SQUARE) ----------
  if (kind === "rail_promo_square_v1") {
    const it = items[0];
    if (!it) return null;

    const href = it.url || (it.slug ? `/article/${it.slug}` : "#");
    const img =
      it.image?.url ||
      it.imageUrl ||
      (typeof it.cover === "string" ? it.cover : it.cover?.url) ||
      it.thumbnailUrl ||
      "";
    const radius = Number(ui.radius ?? 8);
    const border = ui.border ? "1px solid #eee" : "none";
    const overlay = Number(ui.overlay ?? 0);

    // no header / no scroll / no padding
    return (
      <section
        className="rail-block"
        data-rail-type="rail_promo_square_v1"
        style={{ padding: 0 }}
      >
        <a
          href={href}
          className="promo-square-only"
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            aspectRatio: "1 / 1",
            overflow: "hidden",
            borderRadius: 0,
            border,
            background: "#e5e7eb",
          }}
        >
          {img ? (
            <>
              <img
                src={img}
                alt={it.title || "promo"}
                loading="lazy"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {overlay > 0 && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,.35)",
                    opacity: overlay,
                    pointerEvents: "none",
                  }}
                />
              )}
            </>
          ) : (
            <div style={{ width: "100%", height: "100%", background: "#e5e7eb" }} />
          )}
        </a>
      </section>
    );
  }

  // ---------- LIST RENDERER (used by list_v1 & rail_list_v1) ----------
  const renderListV1 = () => {
    const visible = Number(config.visible ?? 5);
    const rowHeight = Number(config.rowHeight ?? 78);
    const maxHeight = Math.max(1, visible) * rowHeight;
    const moreLink = config.moreLink || "";

    return (
      <section className="rail-block" data-rail-type={kind}>
        <div className="rail-head">
          <h3 className="rail-title">{title}</h3>
          {moreLink ? (
            <Link to={moreLink} className="rail-more">
              View all →
            </Link>
          ) : null}
        </div>

        <div className="rail-scroll" style={{ maxHeight }}>
          <div className="rail-list">
            {items.map((a, idx) => {
              const key = a.id || a._id || a.slug || idx;
              const href = a.slug ? `/article/${a.slug}` : "#";
              const time = a.publishedAt
                ? new Date(a.publishedAt).toLocaleDateString()
                : "";
              const cat =
                typeof a.category === "string"
                  ? a.category
                  : a.category?.name || "";
              const img =
                a.imageUrl ||
                (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
                a.thumbnailUrl ||
                a.image?.url ||
                "";

              return (
                <Link to={href} key={key} className="rail-item">
                  <div className="rail-thumb">
                    {img ? (
                      <img src={img} alt={a.imageAlt || a.title || ""} loading="lazy" />
                    ) : (
                      <div className="rail-ph" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <div className="rail-item-title">{a.title}</div>
                    <div className="rail-meta">
                      {time}
                      {cat ? <> • {cat}</> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  // ...inside RailRenderer.jsx, after kind/ui/items/constants

/* =========================
   LIVE BLOG (no images)
   ========================= */
if (kind === "rail_live_blog_v1") {
  const visible = Number(config.visible ?? 6);
  const rowHeight = Number(config.rowHeight ?? 64);
  const maxHeight = Math.max(1, visible) * rowHeight;
  const heading = title || "LIVE BLOG";
  const moreLink = config.moreLink || "";

  const renderItem = (a, idx) => {
    const key = a.id || a._id || a.slug || idx;
    const href = a.url || (a.slug ? `/article/${a.slug}` : "#");
    const when = a.publishedAt ? new Date(a.publishedAt) : null;

    // simple relative time (fallback to locale date)
    let ts = "";
    if (when) {
      const mins = Math.floor((Date.now() - when.getTime()) / 60000);
      if (mins < 1) ts = "just now";
      else if (mins < 60) ts = `${mins} minute${mins === 1 ? "" : "s"} ago`;
      else {
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) ts = `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
        else ts = when.toLocaleDateString();
      }
    }

    return (
      <a key={key} href={href} className="live-item">
        <span className="live-dot" aria-hidden="true" />
        <div className="live-content">
          <div className="live-title">{a.title}</div>
          {ts ? <div className="live-time">{ts}</div> : null}
        </div>
      </a>
    );
  };

  return (
    <section className="rail-block live-blog" data-rail-type="rail_live_blog_v1">
      <div className="rail-head live-head">
        <span className="live-head-dot" aria-hidden="true" />
        <h3 className="rail-title">{heading}</h3>
        {moreLink ? (
          <a className="rail-more" href={moreLink}>More</a>
        ) : null}
      </div>

      <div className="rail-scroll" style={{ maxHeight }}>
        <div className="live-list">
          {items.map(renderItem)}
        </div>
      </div>
    </section>
  );
}


  // ---------- LIST V2 (numbered) ----------
  if (kind === "rail_list_v2") {
    const visible = Number(config.visible ?? 5);
    const rowHeight = Number(config.rowHeight ?? 78);
    const maxHeight = Math.max(1, visible) * rowHeight;
    const moreLink = config.moreLink || "";

    return (
      <section className="rail-block" data-rail-type="rail_list_v2">
        <div className="rail-head">
          <h3 className="rail-title">{title}</h3>
          {moreLink ? (
            <Link to={moreLink} className="rail-more">
              View all →
            </Link>
          ) : null}
        </div>
        <div className="rail-scroll" style={{ maxHeight }}>
          <div className="rail-list">
            {items.map((a, idx) => {
              const key = a.id || a._id || a.slug || idx;
              const href = a.slug ? `/article/${a.slug}` : "#";
              const time = a.publishedAt
                ? new Date(a.publishedAt).toLocaleDateString()
                : "";
              const cat =
                typeof a.category === "string"
                  ? a.category
                  : a.category?.name || "";
              const img =
                a.imageUrl ||
                (typeof a.cover === "string" ? a.cover : a.cover?.url) ||
                a.thumbnailUrl ||
                a.image?.url ||
                "";

              return (
                <Link to={href} key={key} className="rail-item rail-item--v2">
                  <div className="rail-thumb">
                    {img ? (
                      <img src={img} alt={a.imageAlt || a.title || ""} loading="lazy" />
                    ) : (
                      <div className="rail-ph" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <div className="rail-item-title">
                      <span style={{
                        display: "inline-block",
                        width: 20, textAlign: "right", marginRight: 6,
                        fontWeight: 800
                      }}>
                        {idx + 1}.
                      </span>
                      {a.title}
                    </div>
                    <div className="rail-meta">
                      {time}
                      {cat ? <> • {cat}</> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ---------- list_v1 + rail_list_v1 + unknown -> list_v1 ----------
  if (kind === "list_v1" || kind === "rail_list_v1") {
    return renderListV1();
  }
  // unknown: still render as list_v1 so nothing disappears
  return renderListV1();
}
