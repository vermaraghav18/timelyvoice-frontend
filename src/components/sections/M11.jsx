import React from "react";
import "./m11.css";

/* time-ago helper */
function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

/** Namespaced tile card for the dense grid */
function TileCard({ item = {} }) {
  const href = item.href || (item.slug ? `/news/${item.slug}` : "#");
  return (
    <a className="m11-tile" href={href} aria-label={item.title}>
      {item.imageUrl && (
        <div className="m11-tile-media">
          <img
            src={item.imageUrl}
            alt={item.imageAlt || item.title || ""}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div className="m11-tile-content">
        <h4 className="m11-tile-title">{item.title}</h4>
        {item.publishedAt && (
          <time className="m11-tile-time">{timeAgo(item.publishedAt)}</time>
        )}
      </div>
    </a>
  );
}

export default function M11({ data }) {
  if (!data) return null;

  const {
    lead,
    hero = { headline: null, related: [] },
    markets = [],
    rails = [[], []],
    grid = [],
  } = data;

  return (
    <section className="m11" aria-label="Finance & Markets">
      {/* HEADER: Lead | Hero | Markets */}
      <div className="m11-header">
        {/* Lead — big image, tight card, no extra spacing */}
        {lead && (
          <a
            className="m11-lead m11-card"
            href={lead.href || `/news/${lead.slug}`}
            aria-label={lead.title}
          >
            {lead.imageUrl && (
              <figure className="m11-lead-figure">
                <img
                  src={lead.imageUrl}
                  alt={lead.imageAlt || lead.title || ""}
                  loading="eager"
                  fetchpriority="high"
                  decoding="async"
                />
              </figure>
            )}
            <div className="m11-lead-body">
              <h2 className="m11-lead-title">{lead.title}</h2>
              {lead.summary && <p className="m11-lead-summary">{lead.summary}</p>}
              {lead.publishedAt && (
                <time className="m11-meta">{timeAgo(lead.publishedAt)}</time>
              )}
            </div>
          </a>
        )}

        {/* Center — edge-to-edge: image on top (if any), then title/deck; related as media rows */}
        <article className="m11-hero m11-card">
          {hero?.headline?.imageUrl && (
            <figure className="m11-hero-figure">
              <img
                src={hero.headline.imageUrl}
                alt={hero.headline.imageAlt || hero.headline.title || ""}
                loading="eager"
                decoding="async"
              />
            </figure>
          )}
          <div className="m11-hero-body">
            {hero?.headline && (
              <>
                <a
                  href={hero.headline.href || `/news/${hero.headline.slug}`}
                  className="m11-hero-title"
                >
                  {hero.headline.title}
                </a>
                {hero.headline.summary && (
                  <p className="m11-hero-deck">{hero.headline.summary}</p>
                )}
              </>
            )}

            {!!hero?.related?.length && (
              <ul className="m11-hero-related media-list">
                {hero.related.slice(0, 6).map((r) => (
                  <li key={r.id || r.slug} className="media">
                    {r.imageUrl && (
                      <a
                        href={r.href || `/news/${r.slug}`}
                        className="media-thumb"
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        <img
                          src={r.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      </a>
                    )}
                    <div className="media-content">
                      <a
                        href={r.href || `/news/${r.slug}`}
                        className="media-title"
                      >
                        {r.title}
                      </a>
                      {r.publishedAt && (
                        <time className="m11-meta">{timeAgo(r.publishedAt)}</time>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        {/* Markets — three square boxes stacked vertically */}
        <section className="m11-markets" aria-label="Market Snapshot">
          {markets
            .filter((m) =>
              ["nifty50", "sensex", "usdinr"].includes(
                String(m.id || m.label).toLowerCase()
              )
            )
            .slice(0, 3)
            .map((m) => (
              <a
                className="m11-market m11-card"
                key={m.id || m.label}
                href={m.href || "#"}
                aria-label={m.label}
              >
                <div className="m11-mk-label">{m.label}</div>
                <div className="m11-mk-value">{m.value ?? "—"}</div>
                <div className={`m11-mk-delta ${m.delta?.direction || "flat"}`}>
                  {m.delta?.value ?? "—"}
                </div>
              </a>
            ))}
        </section>
      </div>

      {/* Two rails */}
      <div className="m11-rails">
        {[0, 1].map((idx) => (
          <div className="m11-rail m11-card" key={idx}>
            {(rails[idx] || []).map((it, i) => (
              <a
                key={it.id || it.slug || i}
                className={`m11-rail-item ${i === 0 ? "is-lead" : ""}`}
                href={it.href || `/news/${it.slug}`}
              >
                <span className="m11-rail-title">{it.title}</span>
                {it.publishedAt && (
                  <time className="m11-meta">{timeAgo(it.publishedAt)}</time>
                )}
              </a>
            ))}
          </div>
        ))}
      </div>

      {/* Dense grid — real cards */}
      <div className="m11-grid">
        {grid.map((g) => (
          <TileCard key={g.id || g.slug} item={g} />
        ))}
      </div>
    </section>
  );
}
