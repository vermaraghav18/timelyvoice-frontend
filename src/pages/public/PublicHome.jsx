// src/pages/public/PublicHome.jsx
import { useEffect, useState } from "react";
import { api, styles, upsertTag } from "../../App.jsx";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import SectionRenderer from "../../components/sections/SectionRenderer.jsx";
import "../../styles/rails.css";

export default function PublicHome() {
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState("");

  /* ---------- SEO ---------- */
  useEffect(() => {
    const homeUrl = window.location.origin + "/";
    document.title = "My News — Latest headlines";
    upsertTag("link", { rel: "canonical", href: homeUrl });
    upsertTag("meta", {
      name: "description",
      content: "Latest politics, business, tech, sports and world news.",
    });
  }, []);

  /* ---------- Main sections plan (Admin) ---------- */
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setSectionsLoading(true);
        setSectionsError("");

        // Build params WITHOUT sending a blank sectionValue
        const params = { sectionType: "homepage", mode: "public" };
        // If you ever set a non-empty value for homepage, include it:
        // params.sectionValue = "some-slug";

        // IMPORTANT: baseURL is '/api', so use relative path here
        const res = await api.get("/sections/plan", { params });

        const data = Array.isArray(res.data) ? res.data : [];

        // Normalize + sort ONCE by placementIndex (numeric)
        const ordered = data
          .map((r) => ({
            ...r,
            placementIndex: Number.isFinite(Number(r.placementIndex))
              ? Number(r.placementIndex)
              : 0,
          }))
          .sort((a, b) => a.placementIndex - b.placementIndex);

        if (!cancel) setSections(ordered);
      } catch (e) {
        if (!cancel) {
          setSectionsError("Failed to load homepage sections");
        }
        console.error(e);
      } finally {
        if (!cancel) setSectionsLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  // Define which templates are "full-width mains"
  const MAIN_TEMPLATES = new Set([
    "main_v1",
    "top_v1",
    "top_v2",
    "main_v8",
    "main_m3",
    "main_v9",
    "m10",
    "main_m10",
    "m11",        // ✅ include M11
    "main_m11",   // ✅ alias safeguard
    "ad",         // render ads as full-width blocks in order
  ]);

  // Now derive groups WITHOUT re-sorting so global order is preserved
  const mains = sections.filter((s) => MAIN_TEMPLATES.has(s.template));
  const rails = sections.filter((s) => s.template?.startsWith?.("rail_"));
  const others = sections.filter(
    (s) => !MAIN_TEMPLATES.has(s.template) && !s.template?.startsWith?.("rail_")
  );

  return (
    <>
      <SiteNav />

      <main className="container">
        <div style={styles.nav}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }} />
        </div>

        {sectionsLoading && !sections.length ? (
          <div style={{ padding: 12 }}>Loading sections…</div>
        ) : sectionsError ? (
          <div style={{ padding: 12, color: "crimson" }}>{sectionsError}</div>
        ) : (
          <>
            {/* FULL-WIDTH main blocks: rendered in the same order as backend */}
            {mains.map((sec) => (
              <div
                key={sec._id || sec.id || `${sec.slug}|${sec.template}|${sec.placementIndex}`}
                className="fullwidth-section"
                style={{ marginBottom: 24 }}
              >
                <SectionRenderer section={sec} />
              </div>
            ))}

            {/* TWO-COLUMN LAYOUT (others + right rail) */}
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
