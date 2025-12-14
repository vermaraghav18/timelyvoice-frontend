import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build-time injection of internal article links into index.html
 * so crawlers can discover /article/* URLs from the homepage HTML.
 */
function injectBotLinks() {
  const API_ORIGIN =
    process.env.VITE_PUBLIC_API_ORIGIN ||
    "https://timelyvoice-backend.onrender.com";

  const LIMIT = Number(process.env.VITE_BOT_LINKS_LIMIT || 80);

  const escapeHtml = (s = "") =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  async function fetchJson(url, timeoutMs = 9000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function normalizeArticles(payload) {
    // Accept a few possible shapes:
    // 1) { items: [...] }
    // 2) { articles: [...] }
    // 3) [ ... ]
    const arr =
      (payload && payload.items) ||
      (payload && payload.articles) ||
      payload ||
      [];
    if (!Array.isArray(arr)) return [];

    return arr
      .map((a) => ({
        slug: a?.slug,
        title: a?.title,
        summary: a?.summary || a?.description || "",
      }))
      .filter((a) => a.slug && a.title);
  }

  function buildList(items) {
    if (!items.length) {
      // tiny fallback (still gives bots at least something)
      return [
        `<li><a href="/top-news">Top News</a></li>`,
        `<li><a href="/category/india">India</a></li>`,
        `<li><a href="/category/world">World</a></li>`,
        `<li><a href="/category/business">Business</a></li>`,
      ].join("\n");
    }

    return items
      .slice(0, LIMIT)
      .map((a) => {
        const href = `/article/${encodeURIComponent(a.slug)}`;
        const title = escapeHtml(a.title);
        const desc = escapeHtml((a.summary || "").slice(0, 140));
        return `<li style="margin:14px 0">
  <a href="${href}" style="font-size:18px;font-weight:700;text-decoration:none">${title}</a>
  ${desc ? `<div style="color:#444;margin-top:6px">${desc}</div>` : ``}
</li>`;
      })
      .join("\n");
  }

  return {
    name: "inject-bot-links-into-index-html",
    apply: "build",
    enforce: "post",
    async transformIndexHtml(html) {
      const marker = "<!-- BOT_LINKS_PLACEHOLDER -->";
      if (!html.includes(marker)) return html;

      let injected = "";
      try {
        const url = `${API_ORIGIN}/api/articles?limit=${LIMIT}`;
        const json = await fetchJson(url);
        const items = normalizeArticles(json);
        injected = buildList(items);
      } catch (e) {
        injected = buildList([]);
      }

      // Optional comment line so you can grep it in curl output
      const comment = `<!-- BOT_LINKS_INJECTED_AT_BUILD: limit=${LIMIT} -->`;

      return html.replace(marker, `${comment}\n${injected}`);
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
  preview: {
    host: true,
    port: 5173,
    allowedHosts: [".ngrok-free.app"],
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
