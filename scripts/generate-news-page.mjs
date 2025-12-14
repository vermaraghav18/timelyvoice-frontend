import fs from "fs";
import path from "path";

const BACKEND =
  process.env.VITE_BACKEND_URL || "https://timelyvoice-backend.onrender.com";

// Change this endpoint if your backend uses a different one.
// It must return an array of articles with at least: slug, title (and ideally publishedAt)
const API_URL = `${BACKEND}/api/articles?limit=200&status=Published&fields=slug,title,publishedAt&sort=-publishedAt`;

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function main() {
  console.log("[news] fetching:", API_URL);

  const res = await fetch(API_URL, {
    headers: { "User-Agent": "TimelyVoiceBuildBot/1.0" },
  });
  if (!res.ok) throw new Error(`[news] API failed: ${res.status} ${res.statusText}`);

  const data = await res.json();

  // Support either {items: []} or [] responses (common patterns)
  const items = Array.isArray(data) ? data : data.items || data.articles || [];

  // --- DEDUPE by slug (fixes repeated links on /news) ---
  const seen = new Set();

  const links = items
    .filter((a) => a?.slug && a?.title)
    .filter((a) => {
      const key = String(a.slug).trim().toLowerCase();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 200)
    .map((a) => {
      const href = `/article/${a.slug}`;
      const date = a.publishedAt
        ? new Date(a.publishedAt).toISOString().slice(0, 10)
        : "";
      return `<li><a href="${href}">${esc(a.title)}</a>${
        date ? ` <small>(${date})</small>` : ""
      }</li>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Latest News - The Timely Voice</title>
  <meta name="description" content="Latest news links from The Timely Voice." />
  <link rel="canonical" href="https://timelyvoice.com/news" />
  <meta name="robots" content="index,follow" />
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:24px;line-height:1.5}
    h1{margin:0 0 8px}
    p{margin:0 0 16px;color:#444}
    ul{padding-left:20px}
    li{margin:10px 0}
    a{color:#0b57d0;text-decoration:none}
    a:hover{text-decoration:underline}
    small{color:#666}
  </style>
</head>
<body>
  <h1>Latest News</h1>
  <p>Crawlable discovery page for The Timely Voice.</p>
  <ul>
    ${links || `<li>No articles found.</li>`}
  </ul>
</body>
</html>`;

  const outDir = path.resolve(process.cwd(), "public", "news");
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, "index.html");
  fs.writeFileSync(outFile, html, "utf8");

  console.log(`[news] wrote ${outFile} with ${items.length} items`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
