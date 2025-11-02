// frontend/api/edge-ssr/article.ts
export const config = { runtime: "edge" };

const BACKEND =
  process.env.BACKEND_ORIGIN ?? "https://timelyvoice-backend.onrender.com";

/**
 * Proxies the backend SSR HTML for bots (and for manual checks).
 * - Always hits /ssr/article/:slug on the backend (returns full HTML <body>).
 * - Forces a trusted bot UA when the incoming request doesn't provide one.
 * - Normalizes headers so Vercel/CDNs can cache briefly.
 */
export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "";
    if (!slug) {
      return new Response("Missing slug", { status: 400 });
    }

    // If caller didn't set a UA (or it's empty), use a trusted bot UA so
    // backend skips any non-bot geo blocks and serves SSR.
    const incomingUA = req.headers.get("user-agent");
    const ua =
      incomingUA && incomingUA.trim().length > 0
        ? incomingUA
        : "Googlebot/2.1 (+http://www.google.com/bot.html)";

    // IMPORTANT: fetch the backend's SSR HTML route
    const upstream = `${BACKEND}/ssr/article/${encodeURIComponent(slug)}`;

    const r = await fetch(upstream, {
      // Pass through a few headers. Avoid blindly forwarding all.
      headers: {
        "user-agent": ua,
        "x-forwarded-host": url.host,
        "x-forwarded-proto": url.protocol.replace(":", ""),
        // You can add an internal flag if you want to bypass geo in the backend,
        // but not necessary if UA is trusted.
        // "x-edge-ssr": "1",
      },
      cache: "no-store", // just to be explicit; backend controls caching anyway
    });

    const bodyText = await r.text();

    // If backend says 404 or 410 etc, just pass that code + text back
    if (!r.ok) {
      return new Response(bodyText || "Not found", {
        status: r.status,
        headers: {
          "content-type": r.headers.get("content-type") ?? "text/html; charset=utf-8",
          "cache-control": "public, max-age=0, must-revalidate",
          "vary": "user-agent, accept-encoding",
        },
      });
    }

    // Return normalized headers (don’t stream all upstream headers verbatim)
    return new Response(bodyText, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // short cache to be safe; your backend also sets cache headers
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
        "vary": "user-agent, accept-encoding",
      },
    });
  } catch (e) {
    return new Response("Edge SSR proxy failed", { status: 502 });
  }
}
