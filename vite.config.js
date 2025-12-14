import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Build-time injection:
 * - Fetches latest articles from backend
 * - Injects a <ul> of /article/... links inside index.html <noscript>
 * - Also injects ItemList JSON-LD into <head> (helps discovery)
 */
function injectBotLinks() {
  const API =
    process.env.BOT_LINKS_API ||
    "https://timelyvoice-backend.onrender.com/api/articles?limit=80";

  return {
    name: "inject-bot-links",
    apply: "build",

    async transformIndexHtml(html) {
      // Only run if placeholder exists
      if (!html.includes("BOT_LINKS_PLACEHOLDER")) return html;

      let items = [];
      try {
        const res = await fetch(API, {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : json?.articles || [];
          items = (Array.isArray(list) ? list : []).slice(0, 80);
        }
      } catch (e) {
        // Fail silently: keep placeholder empty if API is down at build time
        items = [];
      }

      // Build <li> list (NO extra explanatory text — prevents the “- Vite injects…” leak)
      const safe = (s) =>
        String(s ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const toSlug = (a) => a?.slug || a?._id || "";
      const toTitle = (a) => a?.title || a?.headline || a?.seoTitle || a?.slug || "Article";
      const toSummary = (a) => a?.summary || a?.description || "";

      const liHtml = items
        .map((a) => {
          const slug = toSlug(a);
          if (!slug) return "";
          const title = safe(toTitle(a));
          const summary = safe(toSummary(a)).slice(0, 160);
          return `<li style="margin:14px 0">
  <a href="/article/${safe(slug)}" style="font-size:18px;font-weight:700;text-decoration:none">${title}</a>
  ${summary ? `<div style="color:#444;margin-top:6px">${summary}</div>` : ""}
</li>`;
        })
        .filter(Boolean)
        .join("\n");

      const botBlock =
        items.length === 0
          ? ""
          : `<div style="max-width:920px;margin:24px auto;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
  <ul style="list-style:none;padding:0;margin:0">
${liHtml}
  </ul>
</div>`;

      // Replace placeholder inside <noscript>
      const htmlOut = html.replace("<!-- BOT_LINKS_PLACEHOLDER -->", botBlock);

      // JSON-LD ItemList in <head>
      const itemList = items
        .map((a, idx) => {
          const slug = toSlug(a);
          if (!slug) return null;
          return {
            "@type": "ListItem",
            position: idx + 1,
            url: `https://timelyvoice.com/article/${slug}`,
            name: toTitle(a),
          };
        })
        .filter(Boolean);

      const jsonLd =
        itemList.length === 0
          ? null
          : {
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: itemList,
            };

      if (!jsonLd) return htmlOut;

      return {
        html: htmlOut,
        tags: [
          {
            tag: "script",
            attrs: { type: "application/ld+json" },
            children: JSON.stringify(jsonLd),
            injectTo: "head",
          },
        ],
      };
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
