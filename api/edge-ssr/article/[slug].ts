export const config = { runtime: 'edge' };

const UPSTREAM = 'https://timelyvoice-backend.onrender.com';

export default async function handler(req: Request) {
  // Extract slug from the request URL
  const url = new URL(req.url);
  // path: /api/edge-ssr/article/<slug> (maybe slug has extra / ?)
  const slug = decodeURIComponent(url.pathname.replace(/^\/api\/edge-ssr\/article\//, ''));

  // If slug disappears, return 404 quickly
  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  // Forward bot/country hints to backend (helps your geo/bot logic)
  const fwdHeaders: Record<string, string> = {};
  const copy = (name: string) => {
    const v = req.headers.get(name);
    if (v) fwdHeaders[name] = v;
  };
  [
    'user-agent',
    'cf-ipcountry',
    'x-vercel-ip-country',
    'x-vercel-ip-country-region',
    'x-vercel-ip-city',
  ].forEach(copy);

  // Ask backend SSR endpoint for HTML
  const upstreamUrl = `${UPSTREAM}/ssr/article/${encodeURIComponent(slug)}`;

  // Don’t auto-follow redirects; we want to forward them
  const r = await fetch(upstreamUrl, {
    method: 'GET',
    redirect: 'manual',
    headers: fwdHeaders,
  });

  // If backend asked to redirect (e.g. slug changed), mirror it
  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers.get('location') || `/article/${slug}`;
    return Response.redirect(loc, r.status);
  }

  // If backend failed, bubble status
  if (!r.ok) {
    const text = await r.text().catch(() => 'SSR failed');
    return new Response(text, {
      status: r.status,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  // Stream HTML back to the crawler/browser
  const headers = new Headers(r.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  headers.set(
    'vary',
    'CF-IPCountry, X-Vercel-IP-Country, X-Vercel-IP-Country-Region, X-Vercel-IP-City, User-Agent'
  );

  return new Response(r.body, { status: 200, headers });
}
