import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, upsertTag } from "../../App.jsx";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "./TopNews.css";

const CAT_COLORS = {
  World: "linear-gradient(135deg, #3B82F6 0%, #0073ff 100%)",
  Politics: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  Business: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  Entertainment: "linear-gradient(135deg, #A855F7 0%, rgb(119, 0, 255); )",
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
              const color = CAT_COLORS[a.category] || "#4B5563";

              return (
                <li className="tn-item" key={a.id || a._id || a.slug}>
                  <div className="tn-left">
                    <Link to={href} className="tn-item-title">
                      {a.title}
                    </Link>

                    {(a.summary || a.description || a.excerpt) && (
                      <p className="tn-summary">
                        {a.summary || a.description || a.excerpt}
                      </p>
                    )}

                    {/* Divider line */}
                    <div className="tn-divider"></div>

                    {/* Source pill */}
                    <div className="tn-meta">
  <span className="tn-source">The Timely Voice</span>
</div>

                  </div>

                  <Link to={href} className="tn-thumb">
                    <span className="tn-badge">
                      <span
                        className="tn-pill"
                        style={{ background: color }}
                      >
                        {a.category}
                      </span>
                    </span>

                    {a.imageUrl ? (
                      <img
                        src={a.imageUrl}
                        alt={a.imageAlt || a.title}
                        loading="lazy"
                      />
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
