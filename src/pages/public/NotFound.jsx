// src/pages/public/NotFound.jsx
import { Link } from "react-router-dom";
import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <section
          style={{
            maxWidth: 780,
            margin: "0 auto",
            background: "var(--color-white)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "28px" }}>404 — Page not found</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 8 }}>
            The page you’re looking for doesn’t exist or may have moved.
          </p>
          <div style={{ marginTop: 12 }}>
            <Link to="/" className="btn">
              ← Back to Home
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
