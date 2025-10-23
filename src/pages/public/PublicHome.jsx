// src/pages/public/PublicHome.jsx
import { useEffect, useState } from "react";
import { api, styles, upsertTag } from "../../App.jsx";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";

// Sections (main plan)
import SectionRenderer from "../../components/sections/SectionRenderer.jsx";

// Rails layout styles (kept)
import "../../styles/rails.css";

export default function PublicHome() {
  // Main “plan” sections (Admin-managed)
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
        const res = await api.get("/api/sections/plan", {
          params: { targetType: "homepage", targetValue: "/" },
        });
        if (!cancel) setSections(Array.isArray(res.data) ? res.data : []);
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

  // Partition sections:
  // - full-width mains: main_v1, top_v1, top_v2, main_v8, main_m3, main_v9
  // - rails = any template starting with "rail_"
  // - others = everything else (left column)
  const mains = sections.filter(
    (s) =>
      s.template === "main_v1" ||
      s.template === "top_v1" ||
      s.template === "top_v2" ||
      s.template === "main_v8" ||
      s.template === "main_m3" ||
      s.template === "main_v9"||
      s.template === "m10" ||
      s.template === "main_m10"
  );

  // Respect placementIndex strictly (no template priority)
  const mainsSorted = [...mains].sort(
    (a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
  );

  const rails = sections.filter((s) => s.template?.startsWith("rail_"));
  const railsSorted = [...rails].sort(
    (a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
  );

  const others = sections.filter(
    (s) =>
      !["main_v1", "top_v1", "top_v2", "main_v8", "main_m3", "main_v9","m10", "main_m10"].includes(
        s.template
      ) && !s.template?.startsWith("rail_")
  );
  const othersSorted = [...others].sort(
    (a, b) => (a.placementIndex ?? 0) - (b.placementIndex ?? 0)
  );

  return (
    <>
      <SiteNav />

      <main className="container">
        {/* Page header controls */}
        <div style={styles.nav}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* placeholder for future filters if needed */}
          </div>
        </div>

        {/* ===== FULL-WIDTH main blocks (main_v1 + top_v1 + top_v2 + main_v8 + main_m3 + main_v9) ===== */}
        {sectionsLoading && !sections.length ? (
          <div style={{ padding: 12 }}>Loading sections…</div>
        ) : sectionsError ? (
          <div style={{ padding: 12, color: "crimson" }}>{sectionsError}</div>
        ) : (
          <>
            {mainsSorted.map((sec) => (
              <div
                key={sec.id || sec._id || sec.slug}
                className="fullwidth-section"
                style={{ marginBottom: 24 }}
              >
                <SectionRenderer section={sec} />
              </div>
            ))}

            {/* ===== TWO-COLUMN LAYOUT (others + right rail) ===== */}
            <div className="home-grid home-rails">
              <main>
                {othersSorted.map((sec) => (
                  <SectionRenderer
                    key={sec.id || sec._id || sec.slug}
                    section={sec}
                  />
                ))}
              </main>

              <aside className="rail-wrap">
                {railsSorted.length === 0 ? (
                  <div style={{ padding: 8, color: "#666" }}>No rails</div>
                ) : (
                  railsSorted.map((sec) => (
                    <SectionRenderer
                      key={sec.id || sec._id || sec.slug}
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
