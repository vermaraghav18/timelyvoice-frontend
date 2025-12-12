// frontend/src/lib/adminStyles.js
export const styles = {
  page: {
    padding: 16,
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  nav: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  muted: { color: "#6b7280" },
  p: { margin: "10px 0" },
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 700,
    fontSize: 12,
    marginLeft: 8,
  },
  button: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#0b1b3d",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
  },
  hr: { border: 0, borderTop: "1px solid #e5e7eb", margin: "14px 0" },
};
