export const config = { runtime: "edge" };

const BACKEND =
  process.env.BACKEND_ORIGIN ?? "https://timelyvoice-backend.onrender.com";

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "";
    if (!slug) return new Response("Missing slug", { status: 400 });

    const upstream = `${BACKEND}/ssr/article/${encodeURIComponent(slug)}`;
    const r = await fetch(upstream, {
      headers: {
        "user-agent": req.headers.get("user-agent") ?? "edge",
        "x-forwarded-host": url.host,
        "x-forwarded-proto": url.protocol.replace(":", "")
      }
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(txt, {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") ?? "text/plain" }
      });
    }
    return new Response(r.body, { status: r.status, headers: r.headers });
  } catch {
    return new Response("Edge SSR proxy failed", { status: 502 });
  }
}
