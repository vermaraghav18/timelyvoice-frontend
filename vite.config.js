import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function injectBotLinks() {
  const BACKEND =
    process.env.VITE_BACKEND_ORIGIN ||
    "https://timelyvoice-backend.onrender.com";

  return {
    name: "inject-bot-links",
    apply: "build",
    enforce: "pre",

    async transformIndexHtml(html) {
      // Only do work if placeholder exists
      if (!html.includes("<!-- BOT_LINKS_PLACEHOLDER -->")) return html;

      try {
        const url = `${BACKEND.replace(/\/+$/, "")}/api/articles?limit=80`;
        const res = await fetch(url, {
          headers: { "User-Agent": "ViteBotLinks/1.0" },
        });

        if (!res.ok) {
          throw new Error(`fetch failed ${res.status}`);
        }

        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];

        const links = items
          .filter((a) => a && a.slug && a.title)
          .slice(0, 80)
          .map((a) => {
            const slug = encodeURIComponent(String(a.slug));
            const title = escapeHtml(a.title);
            const summary = escapeHtml(String(a.summary || "").slice(0, 180));
            return `<li><a href="/article/${slug}">${title}</a>${
              summary ? `<div style="color:#444;margin-top:6px">${summary}</div>` : ""
            }</li>`;
          })
          .join("\n");

        const injected = links || `<li>No articles found.</li>`;

        return html.replace("<!-- BOT_LINKS_PLACEHOLDER -->", injected);
      } catch (e) {
        // Safe fallback: do not break build
        const fallback =
          `<li>Latest articles unavailable (build-time fetch failed).</li>`;
        return html.replace("<!-- BOT_LINKS_PLACEHOLDER -->", fallback);
      }
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
