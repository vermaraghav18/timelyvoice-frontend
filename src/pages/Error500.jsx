// src/pages/Error500.jsx
import { Link } from "react-router-dom";

export default function Error500({ error, onRetry }) {
  return (
    <main style={wrap}>
      <section style={card}>
        <div style={{ fontSize: 80, lineHeight: 1, fontWeight: 800 }}>500</div>
        <h1 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 700 }}>
          Something went wrong
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 16px" }}>
          We hit an unexpected error. {error?.message ? `(${error.message})` : null}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {onRetry ? <button onClick={onRetry} style={btnPrimary}>Try again</button> : null}
          <Link to="/" style={btnGhost}>Go home</Link>
        </div>
      </section>
    </main>
  );
}

const wrap = { minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, background: "#f8fafc" };
const card = { width: "min(720px, 100%)", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" };
const btnBase = { display: "inline-block", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb", textDecoration: "none", fontSize: 14, cursor: "pointer" };
const btnPrimary = { ...btnBase, background: "#1D9A8E", color: "#fff", borderColor: "#1D9A8E" };
const btnGhost = { ...btnBase, background: "#fff", color: "#0f172a" };
