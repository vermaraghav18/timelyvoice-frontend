import { Link } from "react-router-dom";

export default function CategoryChip({ category }) {
  const cat = typeof category === 'string' ? { name: category, slug: category } : category;
  if (!cat || !cat.slug) return null;

  const style = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 9999,
    background: "#F4F7F6",
    border: "1px solid #1D9A8E20",
    color: "#1D9A8E",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "none",
  };

  return (
    <Link to={`/category/${encodeURIComponent(cat.slug)}`} style={style}>
      {cat.name}
    </Link>
  );
}
