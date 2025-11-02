// api/edge-ssr/article/[slug].ts
export const config = { runtime: "edge" };

const BACKEND =
  process.env.BACKEND_ORIGIN ?? "https://timelyvoice-backend.onrender.com";

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/");
    const slug = segments[segments.length - 1] || "";

    // Always hit the backend SSR endpoint; the rewrite ensures only bots land here.
    const upstream = `${BACKEND}/ssr/article/${encodeURIComponent(slug)}`;

    const r = await fetch(upstream, {
      headers: {
        // Preserve UA for logging/diagnostics on the backend
        "user-agent": req.headers.get("user-agent") ?? "edge",
        "x-forwarded-host": url.host,
        "x-forwarded-proto": url.protocol.replace(":", "")
      }
    });

    // If upstream returns an error, surface the text (helps debugging)
    if (!r.ok) {
      const txt = await r.text();
      return new Response(txt, {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") ?? "text/plain" }
      });
    }

    // Stream HTML straight through (do NOT await r.body)
    return new Response(r.body, {
      status: r.status,
      headers: r.headers
    });
  } catch (err) {
    return new Response("Edge SSR proxy failed", { status: 502 });
  }
}
