import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build-time injection for bots/curl:
 * - Finds <!-- BOT_LINKS_PLACEHOLDER --> in index.html
 * - Fetches latest articles from backend
 * - Injects <ul><li><a href="/article/...">...</a></li></ul>
 *
 * Optional env:
 *   BOT_LINKS_API_BASE=https://timelyvoice-backend.onrender.com
 */
function injectBotLinks() {
  const PLACEHOLDER = "<!-- BOT_LINKS_PLACEHOLDER -->";

  const esc = (s = "") =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const normBase = (u) => String(u || "").replace(/\/+$/, "");

  return {
    name: "inject-bot-links",
    apply: "build",
    enforce: "post",
    async transformIndexHtml(html) {
      if (!html.includes(PLACEHOLDER)) return html;

      const apiBase = normBase(
        process.env.BOT_LINKS_API_BASE || "https://timelyvoice-backend.onrender.com"
      );

      // keep query conservative: limit + fields + sort
      const url =
        `${apiBase}/api/articles` +
        `?limit=80&fields=title,slug,summary,publishAt&sort=-publishAt`;

      let articles = [];

      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "VercelBuildBotLinks/1.0",
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.warn("[inject-bot-links] fetch failed:", res.status, res.statusText);
        } else {
          const data = await res.json();

          // support common shapes: { articles: [...] } OR [...]
          const raw =
            Array.isArray(data?.articles) ? data.articles :
            Array.isArray(data) ? data :
            [];

          articles = raw
            .filter((a) => a && a.slug && a.title)
            .slice(0, 80)
            .map((a) => ({
              slug: String(a.slug),
              title: String(a.title),
              summary: String(a.summary || "").slice(0, 180),
            }));
        }
      } catch (e) {
        console.warn("[inject-bot-links] exception:", e?.message || e);
      }

      const linksHtml = articles.length
        ? `
<div data-bot-links="1" style="padding:0;margin:0">
  <ul style="list-style:none;padding:0;margin:0">
    ${articles
      .map(
        (a) => `
    <li style="margin:14px 0">
      <a href="/article/${esc(a.slug)}" style="font-size:18px;font-weight:700;text-decoration:none">${esc(
          a.title
        )}</a>
      ${a.summary ? `<div style="color:#444;margin-top:6px">${esc(a.summary)}</div>` : ""}
    </li>`
      )
      .join("")}
  </ul>
</div>`.trim()
        : `<div data-bot-links="1" style="display:none"></div>`;

      return html.replace(PLACEHOLDER, linksHtml);
    },
  };
}

export default defineConfig({
  plugins: [react(), injectBotLinks()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [".ngrok-free.app"],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    cssCodeSplit: true,
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
