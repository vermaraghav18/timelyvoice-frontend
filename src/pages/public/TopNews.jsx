// frontend/src/pages/public/TopNews.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, upsertTag } from "../../App.jsx";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "./TopNews.css";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const CAT_COLORS = {
  World: "#3B82F6",
  Politics: "#F59E0B",
  Business: "#10B981",
  Entertainment: "#A855F7",
  General: "#6B7280",
  Health: "#EF4444",
  Science: "#22D3EE",
  Sports: "#84CC16",
  Tech: "#FB7185",
};

function articleHref(slug) {
  if (!slug) return "#";
  if (/^https?:\/\//i.test(slug)) return slug;
  if (slug.startsWith("/article/")) return slug;
  if (slug.startsWith("/")) return `/article${slug}`;
  return `/article/${slug}`;
}

export default function TopNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    document.title = "Top News — The Timely Voice";
    upsertTag("link", { rel: "canonical", href: window.location.origin + "/top-news" });
    upsertTag("meta", {
      name: "description",
      content: "All the latest headlines across categories, newest first.",
    });
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await api.get("/api/top-news", { params: { limit: 50, page: 1 } });
        if (!cancel) setItems(res?.data?.items || []);
      } catch (e) {
        console.error(e);
        if (!cancel) setErr("Failed to load top news");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
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
              const t = timeAgo(a.publishedAt);
              const color = CAT_COLORS[a.category] || "#4B5563";

              return (
                <li className="tn-item" key={a.id || a._id || a.slug}>
                  <div className="tn-left">
                    <Link to={href} className="tn-item-title">{a.title}</Link>
                    <div className="tn-meta">
                      <span className="tn-pill" style={{ backgroundColor: color }}>
                        {a.category}
                      </span>
                      <span className="tn-source">The Timely Voice</span>
                      {t ? <span className="tn-dot">•</span> : null}
                      {t ? <span className="tn-time">{t}</span> : null}
                    </div>
                  </div>

                  <Link to={href} className="tn-thumb">
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
