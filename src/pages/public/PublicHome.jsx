// src/pages/public/PublicHome.jsx
import { useEffect, useState, useMemo } from "react";

// ✅ NEW: import from libs (NOT App.jsx)
import { cachedGet } from "../../lib/publicApi.js";
import { styles } from "../../lib/uiTokens.js";
import {
  upsertTag,
  removeManagedHeadTags,
  setJsonLd,
  buildCanonicalFromLocation,
} from "../../lib/seoHead.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import SectionRenderer from "../../components/sections/SectionRenderer.jsx";
import "../../styles/rails.css";

export default function PublicHome() {
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  // ✅ Keep stable set (avoid recreating each render)
  const MAIN_TEMPLATES = useMemo(
    () =>
      new Set([
        "main_v1",
        "top_v1",
        "top_v2",
        "main_v8",
        "main_m3",
        "main_v9",
        "m10",
        "main_m10",
        "m11",
        "main_m11",
        "ad",
      ]),
    []
  );

  /* ---------- SEO / HEAD TAGS ---------- */
  useEffect(() => {
    removeManagedHeadTags();

    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://timelyvoice.com";
    const canonical = buildCanonicalFromLocation(); // homepage "/"

    const title = "The Timely Voice — Latest India & World News, Exam-Friendly Updates";
    const desc =
      "The Timely Voice brings clear, exam-focused coverage of India, world affairs, economy, science and policy. Daily fact-based news summaries, background explainers and analysis for students and curious readers.";

    // <title>
    upsertTag("title", {}, { textContent: title });

    // canonical
    upsertTag("link", { rel: "canonical", href: canonical });

    // robots
    upsertTag("meta", {
      name: "robots",
      content: "index,follow",
      "data-managed": "robots",
    });

    // description
    upsertTag("meta", {
      name: "description",
      content: desc,
    });

    // Open Graph
    upsertTag("meta", { property: "og:type", content: "website" });
    upsertTag("meta", { property: "og:title", content: title });
    upsertTag("meta", { property: "og:description", content: desc });
    upsertTag("meta", { property: "og:url", content: canonical });
    upsertTag("meta", { property: "og:site_name", content: "The Timely Voice" });
    upsertTag("meta", { property: "og:image", content: `${origin}/logo-512.png` });

    // Twitter
    upsertTag("meta", { name: "twitter:card", content: "summary_large_image" });
    upsertTag("meta", { name: "twitter:title", content: title });
    upsertTag("meta", { name: "twitter:description", content: desc });
    upsertTag("meta", { name: "twitter:image", content: `${origin}/logo-512.png` });

    // JSON-LD: WebSite + NewsMediaOrganization
    setJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${origin}/#website`,
          url: `${origin}/`,
          name: "The Timely Voice",
          description: desc,
          inLanguage: "en-IN",
          publisher: {
            "@id": `${origin}/#organization`,
          },
        },
        {
          "@type": "NewsMediaOrganization",
          "@id": `${origin}/#organization`,
          name: "The Timely Voice",
          url: `${origin}/`,
          logo: {
            "@type": "ImageObject",
            url: `${origin}/logo-512.png`,
          },
        },
      ],
    });
  }, []);

  /* ---------- Main sections plan (public) ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setSectionsLoading(true);
        setSectionsError("");

        const params = { sectionType: "homepage", mode: "public" };

        // ✅ cachedGet: prevents repeat refetch on fast navigations
        // TTL 30s is enough to feel instant, but still fresh
        const data = await cachedGet("/sections/plan", { params }, 30_000);

        const arr = Array.isArray(data) ? data : [];

        const ordered = arr
          .map((r) => ({
            ...r,
            placementIndex: Number.isFinite(Number(r.placementIndex))
              ? Number(r.placementIndex)
              : 0,
          }))
          .sort((a, b) => a.placementIndex - b.placementIndex);

        if (!cancel) setSections(ordered);
      } catch (e) {
        if (!cancel) setSectionsError("Failed to load homepage sections");
        console.error(e);
      } finally {
        if (!cancel) setSectionsLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  const mains = sections.filter((s) => MAIN_TEMPLATES.has(s.template));
  const rails = sections.filter((s) => s.template?.startsWith?.("rail_"));
  const others = sections.filter(
    (s) => !MAIN_TEMPLATES.has(s.template) && !s.template?.startsWith?.("rail_")
  );

  return (
    <>
      <SiteNav />

      <main className="container">
        {/* top spacer under nav */}
        <div style={styles.nav}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }} />
        </div>

        {/* HOMEPAGE INTRO */}
        <section
          aria-label="The Timely Voice overview"
          style={{
            padding: "12px 0 18px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
            marginBottom: 12,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(20px, 2.2vw, 26px)",
              fontWeight: 700,
              color: "#e5f0ff",
            }}
          >
            The Timely Voice – Latest India & World News, Explained Clearly
          </h1>
          <p
            style={{
              marginTop: 6,
              maxWidth: "60rem",
              fontSize: 15,
              lineHeight: 1.6,
              color: "#cbd5f5",
            }}
          >
            Timely Voice News curates important developments from India and around the world
            and rewrites them in clear, exam-friendly language. Follow concise updates on
            politics, economy, science, technology and global affairs, backed by verified
            sources and editorial checks.
          </p>
        </section>

        {sectionsLoading && !sections.length ? (
          <div style={{ padding: 12 }}>Loading sections…</div>
        ) : sectionsError ? (
          <div style={{ padding: 12, color: "crimson" }}>{sectionsError}</div>
        ) : (
          <>
            {/* FULL-WIDTH main blocks */}
            {mains.map((sec) => (
              <div
                key={sec._id || sec.id || `${sec.slug}|${sec.template}|${sec.placementIndex}`}
                className="fullwidth-section"
                style={{ marginBottom: 24 }}
              >
                <SectionRenderer section={sec} />
              </div>
            ))}

            {/* TWO-COLUMN LAYOUT */}
            <div className="home-grid home-rails">
              <main>
                {others.length === 0 ? (
                  <div style={{ padding: 8, color: "#666" }}>No sections</div>
                ) : (
                  others.map((sec) => (
                    <SectionRenderer
                      key={sec._id || sec.id || `${sec.slug}|${sec.template}|${sec.placementIndex}`}
                      section={sec}
                    />
                  ))
                )}
              </main>

              <aside className="rail-wrap">
                {rails.length === 0 ? (
                  <div style={{ padding: 8, color: "#666" }}>No rails</div>
                ) : (
                  rails.map((sec) => (
                    <SectionRenderer
                      key={sec._id || sec.id || `${sec.slug}|${sec.template}|${sec.placementIndex}`}
                      section={sec}
                    />
                  ))
                )}
              </aside>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
