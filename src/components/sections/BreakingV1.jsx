import { Link } from "react-router-dom";
import "./sections.common.css";

function LiveBadge() {
  return (
    <span className="live-badge">
      LIVE
    </span>
  );
}

export default function BreakingV1({ title, items = [], moreLink }) {
  if (!items.length) return null;

  const hero = items[0];
  const minis = items.slice(1, 6);
  const href = `/article/${hero.slug}`;
  const when = hero.publishedAt ? new Date(hero.publishedAt).toLocaleString() : "";
  const img = hero.imageUrl || "";
  const imgAlt = hero.imageAlt || hero.title || "";
  const isLive = !!(hero.isLive || hero.live || hero.liveFlag);

  return (
    <section className="sec-wrap sec-compact breaking-v1">
      {/* header */}
      <div className="sec-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* 🔴 blinking red dot */}
          <span className="blink-dot"></span>
          <h2 className="sec-title" style={{ color: "#b91c1c" }}>
            {title || "Breaking"}
          </h2>
          {isLive && <LiveBadge />}
        </div>

        {moreLink ? (
          <Link to={moreLink} className="sec-more" style={{ color: "#991b1b" }}>
            All updates →
          </Link>
        ) : null}
      </div>

      {/* HERO */}
      <article
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 48%) 1fr",
          gap: 16,
          padding: 12,
        }}
      >
        <Link
          to={href}
          style={{
            display: "block",
            background: "#fef2f2",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {img ? (
            <img
              src={img}
              alt={imgAlt}
              style={{
                width: "100%",
                height: 0,
                paddingBottom: "56.25%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: 0,
                paddingBottom: "56.25%",
                background: "#fee2e2",
              }}
            />
          )}
        </Link>

        <div>
          <h3 style={{ margin: "0 0 8px", fontSize: 24, lineHeight: 1.25 }}>
            {isLive && <LiveBadge />}
            <Link to={href} style={{ color: "inherit", textDecoration: "none" }}>
              {hero.title}
            </Link>
          </h3>
          {hero.summary && (
            <p style={{ margin: "0 0 8px", color: "#374151", lineHeight: 1.6 }}>
              {hero.summary}
            </p>
          )}
          <small style={{ color: "#991b1b" }}>{when}</small>
        </div>
      </article>

      {/* MINI LINKS */}
      {minis.length > 0 && (
        <div style={{ padding: "0 12px 12px" }}>
          {minis.map((m) => {
            const u = `/article/${m.slug}`;
            const t = m.publishedAt ? new Date(m.publishedAt).toLocaleTimeString() : "";
            const subLive = !!(m.isLive || m.live || m.liveFlag);
            return (
              <div
                key={m.id || m._id || m.slug}
                style={{
                  padding: "8px 0",
                  borderTop: "1px dashed #fecaca",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                }}
              >
                {subLive && <LiveBadge />}
                <Link
                  to={u}
                  style={{
                    textDecoration: "none",
                    color: "#111",
                    fontWeight: 600,
                    lineHeight: 1.35,
                    flex: 1,
                  }}
                >
                  {m.title}
                </Link>
                <small style={{ color: "#991b1b", whiteSpace: "nowrap" }}>{t}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
