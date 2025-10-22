import { Link } from "react-router-dom";
import AspectImage from "../AspectImage.jsx";
import "./TopV1.css";

/** Safely read an article id/slug for dedupe/keys */
function getId(a = {}) {
  return a?.id || a?._id || a?.slug || a?.url || a?.guid || null;
}

/** Pick best image source from normalized article shape */
function pickImg(a = {}) {
  const cover = a.cover;
  return (
    a?.imageUrl ||
    (typeof cover === "string" ? cover : null) ||
    (cover && typeof cover === "object" ? cover.url : null) ||
    ""
  );
}

/** Estimate read time (mins) from summary/title words at ~220 wpm */
function estimateReadMins(a = {}) {
  const text = [a?.summary, a?.title].filter(Boolean).join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length || 0;
  const mins = Math.max(1, Math.round(words / 220) || 3);
  return mins;
}

/** Small “•” separator */
function Dot() {
  return <span className="tv1-dot" aria-hidden>•</span>;
}

/* ---------------- HERO (lead) ---------------- */
function HeroLead({ a }) {
  if (!a) return null;
  const img = pickImg(a);
  const mins = estimateReadMins(a);
  const tag = a.category || (Array.isArray(a.tags) && a.tags[0]) || "";

  return (
    <article className="tv1-hero">
      {img ? (
        <Link to={`/article/${a.slug}`} className="tv1-hero-media">
          <AspectImage ratio="16/9" src={img} alt={a.title} />
          {tag ? (
            <span className="tv1-tag tv1-tag-hero" aria-label="Category">
              {String(tag).toUpperCase()}
            </span>
          ) : null}
        </Link>
      ) : null}

      <div className="tv1-hero-text">
        <Link to={`/article/${a.slug}`} className="tv1-hero-title">
          {a.title}
        </Link>
        {a.summary ? <p className="tv1-hero-summary">{a.summary}</p> : null}
        <div className="tv1-meta">
          <span className="tv1-meta-item">{mins} min read</span>
          {a.publishedAt ? (
            <>
              <Dot />
              <time
                className="tv1-meta-item"
                dateTime={new Date(a.publishedAt).toISOString()}
                title={new Date(a.publishedAt).toLocaleString()}
              >
                {new Date(a.publishedAt).toLocaleDateString()}
              </time>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* ---------------- Grid card (IMAGE == CARD) ---------------- */
function GridCard({ a }) {
  if (!a) return null;
  const img = pickImg(a);

  return (
    <article className="tv1-card is-image-tile">
      <Link to={`/article/${a.slug}`} className="tv1-card-link">
        {/* image fills the entire card */}
        <div className="tv1-card-media-fill" aria-hidden>
          {img ? <img src={img} alt="" /> : null}
        </div>

        {/* overlay title styled like a tag/pill */}
        <div className="tv1-card-overlay">
          <div className="tv1-card-title tv1-card-title--tag">{a.title}</div>
          {/* meta removed per spec */}
        </div>
      </Link>
    </article>
  );
}

/* ---------------- Main renderer ---------------- */
/**
 * Props contract (used by plan builder / admin):
 * - custom.items?: Article[]          // canonical list from server (already filtered/sorted)
 * - custom.limit?: number             // how many to render (default 6)
 * - custom.offset?: number            // start index (0-based). alias: custom.afterNth
 * - custom.zoneItems?: { lead?: [...] , rightStack?: [...], freshStories?: [...], popular?: [...] }
 * - custom.dedupeLead?: boolean       // default true: remove the hero item from grid
 */
export default function TopV1({ section, custom = {} }) {
  // read the configuration
  const limit = Number.isFinite(custom.limit) ? Number(custom.limit) : 6;
  const offsetRaw =
    Number.isFinite(custom.offset) ? Number(custom.offset) :
    Number.isFinite(custom.afterNth) ? Number(custom.afterNth) : 0;
  const offset = Math.max(0, offsetRaw | 0); // ensure non-negative integer
  const dedupeLead = custom.dedupeLead !== false; // default true

  // prefer server-provided canonical list
  const itemsFromServer = Array.isArray(custom.items) ? custom.items : null;

  // legacy/fallback zones (only used if items not provided)
  const zones = custom.zoneItems || {};
  const { lead = [], rightStack = [], freshStories = [], popular = [] } = zones;

  const fallbackPool = [...rightStack, ...freshStories, ...popular].filter(Boolean);

  // compute final candidate list with offset + limit
  let list = (itemsFromServer ?? fallbackPool).slice(offset, offset + limit);

  // optional: dedupe hero (lead[0]) from grid if present
  if (dedupeLead && lead?.[0]) {
    const heroId = getId(lead[0]);
    if (heroId) {
      list = list.filter((a) => getId(a) !== heroId);
      // if we removed one due to dedupe and still want `limit` items,
      // top up from the source list (beyond the current window) when possible
      const source = itemsFromServer ?? fallbackPool;
      if (list.length < limit) {
        const needed = limit - list.length;
        const takenIds = new Set(list.map(getId));
        takenIds.add(heroId);
        for (let i = offset + limit; i < source.length && list.length < limit; i++) {
          const cand = source[i];
          const candId = getId(cand);
          if (!candId || takenIds.has(candId)) continue;
          list.push(cand);
          takenIds.add(candId);
        }
      }
    }
  }

 return (
  <section className="topv1">
    {list.length ? (
      <div className="tv1-grid">
        {list.map((a) => (
          <GridCard key={getId(a) || Math.random().toString(36)} a={a} />
        ))}
      </div>
    ) : null}
  </section>
);

}
