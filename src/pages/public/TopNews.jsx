// frontend/src/pages/public/TopNews.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, upsertTag, buildCanonicalFromLocation } from "../../App.jsx";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "./TopNews.css";

const CAT_COLORS = {
  World: "linear-gradient(135deg, #3B82F6 0%, #0073ff 100%)",
  Politics: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  Business: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  Entertainment: "linear-gradient(135deg, #A855F7 0%, rgb(119, 0, 255))",
  General: "linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)",
  Health: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
  Science: "linear-gradient(135deg, #22D3EE 0%, #67E8F9 100%)",
  Sports: "linear-gradient(135deg, #abcc16 0%, #9dff00 100%)",
  Tech: "linear-gradient(135deg, #FB7185 0%, #FDA4AF 100%)",
};

function articleHref(slug) {
  if (!slug) return "#";
  if (/^https?:\/\//i.test(slug)) return slug;
  if (slug.startsWith("/article/")) return slug;
  if (slug.startsWith("/")) return `/article${slug}`;
  return `/article/${slug}`;
}

/** Safely parse many timestamp shapes → epoch ms (number) */
function parseTs(v) {
  if (!v) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const withT = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/, "$1T$2");
  const t = Date.parse(withT);
  return Number.isFinite(t) ? t : 0;
}

/** Normalize + sort newest first (stable) */
function normalizeTopNews(items = []) {
  return items
    .filter(Boolean)
    .map((i, idx) => {
      const candidates = [
        i.publishedAt,
        i.publishAt,      // many payloads use this
        i.updatedAt,
        i.updated_at,
        i.createdAt,
        i.created_at,
        i.pubDate,
        i.timestamp,
      ];
      const best = Math.max(...candidates.map(parseTs), 0);
      return { ...i, _ts: best, _idx: idx };
    })
    .sort((a, b) => (b._ts === a._ts ? a._idx - b._idx : b._ts - a._ts));
}

/** Case-insensitive category name */
function getCategoryName(a) {
  const raw = a?.category?.name ?? (typeof a?.category === "string" ? a.category : "General");
  const map = {
    world: "World", politics: "Politics", business: "Business",
    entertainment: "Entertainment", general: "General", health: "Health",
    science: "Science", sports: "Sports", tech: "Tech", technology: "Tech",
  };
  return map[String(raw || "General").trim().toLowerCase()] || "General";
}

export default function TopNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // SEO
  useEffect(() => {
    document.title = "Top News — The Timely Voice";
    const canonical = buildCanonicalFromLocation(["top-news"]);
    upsertTag("link", { rel: "canonical", href: canonical });
    upsertTag("meta", {
      name: "description",
      content: "All the latest headlines across categories, newest first.",
    });
  }, []);

  // Fetch (cache-buster) + normalize
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const qs = new URLSearchParams({
          page: 1,
          limit: 50,
          mode: "public",
          __bust: Date.now(), // dev-only cache buster
        });

        const res = await api.get(`/top-news?${qs.toString()}`, {
          validateStatus: () => true,
          headers: { "Cache-Control": "no-cache" },
        });

        if (!cancel) {
          const sorted = normalizeTopNews(res?.data?.items || []);
          setItems(sorted);

          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.table(
              sorted.slice(0, 5).map((x) => ({
                title: x.title,
                ts: x._ts,
                published: x.publishedAt ?? x.publishAt ?? x.updatedAt,
              }))
            );
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        if (!cancel) setErr("Failed to load top news");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="tn-title">Top News</h1>

        {loading && <div className="tn-status">Loading…</div>}
        {err && <div className="tn-error">{err}</div>}

        {!loading && !err && (
          <ul className="tn-list">
            {items.map((a) => {
              const href = articleHref(a.slug);
              const catName = getCategoryName(a);
              const color = CAT_COLORS[catName] || "#4B5563";

              return (
                <li className="tn-item" key={a.id || a._id || a.slug}>
                  <div className="tn-left">
                    <Link to={href} className="tn-item-title">
                      {a.title}
                    </Link>

                    {(a.summary || a.description || a.excerpt) && (
                      <Link
                        to={href}
                        className="tn-summary"
                        style={{ display: "block", textDecoration: "none", color: "inherit" }}
                        aria-label={`Open: ${a.title}`}
                      >
                        {a.summary || a.description || a.excerpt}
                      </Link>
                    )}

                    <div className="tn-divider"></div>

                    <div className="tn-meta">
                      <span className="tn-source">The Timely Voice</span>
                    </div>
                  </div>

                  <Link to={href} className="tn-thumb">
                    <span className="tn-badge">
                      <span className="tn-pill" style={{ background: color }}>
                        {catName}
                      </span>
                    </span>

                    {a.imageUrl ? (
                      <img src={a.imageUrl} alt={a.imageAlt || a.title} loading="lazy" />
                    ) : (
                      <div className="tn-thumb ph" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
