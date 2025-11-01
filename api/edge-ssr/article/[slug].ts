export const config = { runtime: "edge" };

const BOT_UA =
  /Googlebot|AdsBot|bingbot|DuckDuckBot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot/i;

// set this in Vercel → Project → Settings → Environment Variables
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN || "http://localhost:4000";

/**
 * For /article/:slug requests:
 *  - Bots → proxy to backend SSR  ( /ssr/article/:slug )
 *  - Humans → serve the SPA (index.html), letting React handle routing
 */
export default async function handler(req: Request, ctx: any) {
  const url = new URL(req.url);

  // Force canonical host (optional but recommended)
  if (url.hostname === "timelyvoice.com") {
    url.hostname = "www.timelyvoice.com";
    return Response.redirect(url.toString(), 308);
  }

  // Resolve slug from pathname: /article/<slug>
  const slug = url.pathname.replace(/^\/article\//, "");
  if (!slug) {
    // no slug → send SPA
    return serveSPA(req, url);
  }

  const ua = String(req.headers.get("user-agent") || "");
  const isBot = BOT_UA.test(ua);

  if (!isBot) {
    // Human → serve SPA so the client app hydrates /article/:slug
    return serveSPA(req, url);
  }

  // Bot → fetch server-rendered HTML from backend
  const ssrUrl = `${BACKEND_ORIGIN}/ssr/article/${encodeURIComponent(slug)}`;

  // pass geo & useful headers through to backend
  const passthroughHeaders = new Headers();
  for (const h of [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-vercel-ip-country-region",
    "x-vercel-ip-city",
    "accept-language",
    "user-agent",
  ]) {
    const v = req.headers.get(h);
    if (v) passthroughHeaders.set(h, v);
  }

  const resp = await fetch(ssrUrl, {
    headers: passthroughHeaders,
    // Edge fetch defaults to GET; keep it simple
  });

  // Forward status/body, but ensure good caching for bots
  const outHeaders = new Headers(resp.headers);
  outHeaders.set(
    "Cache-Control",
    // cache briefly at browser & longer at CDN; tweak as you like
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );
  outHeaders.set(
    "Vary",
    "CF-IPCountry, X-Vercel-IP-Country, X-Vercel-IP-Country-Region, X-Vercel-IP-City, Authorization"
  );
  outHeaders.set("X-Edge-SSR", "1");

  return new Response(resp.body, {
    status: resp.status,
    headers: outHeaders,
  });
}

function serveSPA(req: Request, url: URL) {
  // Let Vercel serve the built index.html and assets
  const assetUrl = new URL("/", url);
  // Important: we want the actual built index.html, not a redirect
  return fetch(assetUrl.toString(), {
    headers: {
      // Helps with correct content negotiation
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
}
