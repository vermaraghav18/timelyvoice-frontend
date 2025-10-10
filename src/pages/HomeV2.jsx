// frontend/src/pages/HomeV2.jsx
import RightRailV2 from "../components/rails/RightRailV2";
import "./homeTwoCol.css"; // layout shell

// Example items fetcher — reuse your current backend query logic
async function fetchItemsForSection(section) {
  const r = await fetch("/api/articles/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(section.query || {}),
  });
  const data = await r.json();
  return data.items || data || [];
}

export default function HomeV2({ LeftContent }) {
  return (
    <div className="home-two-col">
      <main className="home-two-col__left">
        {LeftContent ? <LeftContent /> : null /* your existing left-side renderer */}
      </main>
      <RightRailV2 fetchItemsForSection={fetchItemsForSection} />
    </div>
  );
}
