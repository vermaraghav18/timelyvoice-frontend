// src/pages/NotFound.jsx
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main style={wrap}>
      <section style={card}>
        <div style={{ fontSize: 80, lineHeight: 1, fontWeight: 800 }}>404</div>
        <h1 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 700 }}>
          Page not found
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 16px" }}>
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/" style={btnPrimary}>Go home</Link>
          <Link to="/category/general" style={btnGhost}>Browse latest</Link>
        </div>
      </section>
    </main>
  );
}

const wrap = { minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc" };
const card = { width: "min(720px, 100%)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" };
const btnBase = { display: "inline-block", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", textDecoration: "none", fontSize: 14 };
const btnPrimary = { ...btnBase, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };
const btnGhost = { ...btnBase, background: "#fff", color: "#0f172a" };
