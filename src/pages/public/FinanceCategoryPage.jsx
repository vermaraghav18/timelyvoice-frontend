// src/pages/public/FinanceCategoryPage.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../App.jsx";
import { upsertTag, removeManagedHeadTags } from "../../lib/seoHead.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "../public/TopNews.css";
import SectionRenderer from "../../components/sections/SectionRenderer.jsx";

/* ---------- helpers ---------- */
const normPath = (p = "") => String(p).trim().replace(/\/+$/, "") || "/";
const toTitleCase = (x = "") =>
  x ? x.charAt(0).toUpperCase() + x.slice(1).toLowerCase() : x;

function timeAgo(input) {
  const d = input ? new Date(input) : null;
  if (!d || isNaN(d)) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const dsy = Math.floor(h / 24);
  if (dsy < 30) return `${dsy} day${dsy === 1 ? "" : "s"} ago`;
  const mo = Math.floor(dsy / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? "" : "s"} ago`;
}

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
  return `/article/${slug}`;
}

function getCategoryLabel(article, fallback) {
  const cat = article?.category;

  if (cat && typeof cat === "object") {
    return cat.name || cat.slug || fallback;
  }

  if (typeof cat === "string") {
    // if it's a 24-char hex string (Mongo ObjectId), use fallback
    if (/^[0-9a-fA-F]{24}$/.test(cat)) return fallback;
    return cat;
  }

  return fallback;
}

/* =========================================================
   ✅ Google AdSense (same approach as CategoryPage.jsx)
   ========================================================= */
const ADS_CLIENT = "ca-pub-8472487092329023";

// Reuse your existing slots (from CategoryPage.jsx)
const ADS_SLOT_MAIN = "3149743917";
const ADS_SLOT_SECOND = "3149743917";
const ADS_SLOT_FLUID_KEY = "1442744724";
const ADS_SLOT_IN_ARTICLE = "9569163673";
const ADS_SLOT_AUTORELAXED = "2545424475";

function useAdsPush(deps = []) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function AdSenseAuto({ slot, style }) {
  useAdsPush([slot]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", width: "100%", maxWidth: "100%", ...style }}
      data-ad-client={ADS_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

function AdSenseFluidKey({ style }) {
  useAdsPush([]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", ...style }}
      data-ad-format="fluid"
      data-ad-layout-key="-ge-1b-1q-el+13l"
      data-ad-client={ADS_CLIENT}
      data-ad-slot={ADS_SLOT_FLUID_KEY}
    />
  );
}

function AdSenseInArticle({ style }) {
  useAdsPush([]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", textAlign: "center", ...style }}
      data-ad-layout="in-article"
      data-ad-format="fluid"
      data-ad-client={ADS_CLIENT}
      data-ad-slot={ADS_SLOT_IN_ARTICLE}
    />
  );
}

function AdSenseAutoRelaxed({ style }) {
  useAdsPush([]);
  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", ...style }}
      data-ad-format="autorelaxed"
      data-ad-client={ADS_CLIENT}
      data-ad-slot={ADS_SLOT_AUTORELAXED}
    />
  );
}

// Insert ads even for smaller categories: after 3rd, 8th, 13th items
function shouldShowAdAtIndex(idx0) {
  const pos = idx0 + 1; // 1-based
  return [3, 8, 13].includes(pos);
}

/* ---------- PAGE ---------- */
export default function FinanceCategoryPage({
  categorySlug = "finance",
  displayName = "Finance",
}) {
  const { pathname } = useLocation();
  const pagePath = normPath(pathname);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [pageSections, setPageSections] = useState([]);

  const canonical = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}${pathname}`;
  }, [pathname]);

  /* ---------- SEO ---------- */
  useEffect(() => {
    removeManagedHeadTags();
    upsertTag("title", {}, { textContent: `${displayName} — The Timely Voice` });
    upsertTag("meta", {
      name: "description",
      content: `${displayName} headlines and latest stories — newest first.`,
    });
    if (canonical) upsertTag("link", { rel: "canonical", href: canonical });
  }, [canonical, displayName]);

  /* ---------- FETCH ARTICLES (PUBLIC CATEGORY ENDPOINT) ---------- */
  useEffect(() => {
    let alive = true;

    async function fetchArticles() {
      setLoading(true);
      setErr("");
      setItems([]);

      const raw = String(categorySlug || "").trim();
      const effective = raw || toTitleCase(displayName || ""); // small safety, no behavior change in normal cases

      try {
        const r = await api.get(
          `/public/categories/${encodeURIComponent(effective)}/articles`,
          {
            params: { limit: 60 },
            validateStatus: () => true,
          }
        );

        if (!alive) return;

        if (r.status === 200 && Array.isArray(r?.data?.items)) {
          setItems(r.data.items);
          return;
        }

        setErr("No stories found for this category.");
      } catch (e) {
        if (alive) setErr("Failed to load stories");
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchArticles();
    return () => {
      alive = false;
    };
  }, [categorySlug, displayName]);

  /* ---------- PAGE SECTIONS ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const res = await api.get("/sections", { params: { path: pagePath } });
        const list = Array.isArray(res.data) ? res.data : [];
        const filtered = list
          .filter(
            (s) =>
              s?.enabled !== false &&
              s?.target?.type === "path" &&
              normPath(s?.target?.value) === pagePath
          )
          .sort((a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0));
        if (!cancel) setPageSections(filtered);
      } catch {
        if (!cancel) setPageSections([]);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [pagePath]);

  /* ---------- RENDER ---------- */
  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="tn-title">{displayName}</h1>

        {pageSections.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {pageSections.map((sec) => (
              <div
                key={sec._id || sec.id || sec.slug}
                style={{ marginBottom: 12 }}
              >
                <SectionRenderer section={sec} />
              </div>
            ))}
          </div>
        )}

        {/* ✅ Optional: a top ad under heading (kept conservative; only if not loading/error) */}
        {!loading && !err && (
          <div style={{ margin: "10px 0 14px", textAlign: "center" }}>
            <AdSenseAuto slot={ADS_SLOT_MAIN} />
          </div>
        )}

        {loading && <div className="tn-status">Loading…</div>}
        {err && <div className="tn-error">{err}</div>}

        {!loading && !err && (
          <>
            {items.length === 0 ? (
              <div className="tn-status">
                No {displayName.toLowerCase()} stories yet.
              </div>
            ) : (
              <ul className="tn-list">
                {items.map((a, idx) => {
                  const href = articleHref(a.slug);
                  const catLabel = getCategoryLabel(a, displayName);
                  const pillBg = CAT_COLORS[catLabel] || "#4B5563";

                  const summary = a.summary || a.description || a.excerpt || "";

                  return (
                    <div key={(a._id || a.id || a.slug || idx) + "-wrap"}>
                      <li className="tn-item" key={a._id || a.id || a.slug}>
                        <div className="tn-left">
                          <Link to={href} className="tn-item-title">
                            {a.title}
                          </Link>

                          {summary ? (
                            <Link
                              to={href}
                              className="tn-summary"
                              style={{
                                display: "block",
                                textDecoration: "none",
                                color: "inherit",
                              }}
                              aria-label={`Open: ${a.title}`}
                            >
                              {summary}
                            </Link>
                          ) : null}

                          <div className="tn-divider" />

                          <div className="tn-meta">
                            <span className="tn-source">
                              The Timely Voice • Updated{" "}
                              {timeAgo(
                                a.updatedAt ||
                                  a.publishedAt ||
                                  a.publishAt ||
                                  a.createdAt
                              )}
                            </span>
                          </div>
                        </div>

                        <Link to={href} className="tn-thumb">
                          <span className="tn-badge">
                            <span
                              className="tn-pill"
                              style={{ background: pillBg }}
                            >
                              {catLabel}
                            </span>
                          </span>

                          {a.imageUrl ? (
                            <img
                              src={a.imageUrl}
                              alt={a.imageAlt || a.title || ""}
                              loading="lazy"
                            />
                          ) : (
                            <div className="tn-thumb ph" />
                          )}
                        </Link>
                      </li>

                      {/* ✅ In-feed ads (Finance + Health) */}
                      {shouldShowAdAtIndex(idx) && (
                        <>
                          {idx + 1 === 3 && (
                            <div style={{ margin: "12px 0", textAlign: "center" }}>
                              <AdSenseInArticle />
                            </div>
                          )}

                          {idx + 1 === 8 && (
                            <div style={{ margin: "12px 0" }}>
                              <AdSenseFluidKey />
                            </div>
                          )}

                          {idx + 1 === 13 && (
                            <div style={{ margin: "12px 0", textAlign: "center" }}>
                              <AdSenseAuto slot={ADS_SLOT_SECOND} />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </ul>
            )}

            {/* ✅ Bottom relaxed ad */}
            {items.length >= 6 && (
              <div style={{ margin: "16px 0" }}>
                <AdSenseAutoRelaxed />
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
