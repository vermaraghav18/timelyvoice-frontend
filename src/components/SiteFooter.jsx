// src/components/SiteFooter.jsx
export default function SiteFooter() {
  return (
    <footer style={wrap}>
      <div className="container" style={inner}>
        <div style={{ fontWeight: 700 }}>NewsSite</div>
        <div style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-sm)" }}>
          © {new Date().getFullYear()} NewsSite • Built with love.
        </div>
      </div>
    </footer>
  );
}

const wrap = {
  borderTop: "1px solid var(--color-border)",
  background: "var(--color-white)",
  marginTop: 24,
};
const inner = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  paddingTop: 18,
  paddingBottom: 18,
};
