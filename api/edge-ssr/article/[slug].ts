export const config = { runtime: 'edge' };

const UPSTREAM = 'https://timelyvoice-backend.onrender.com';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const slug = decodeURIComponent(url.pathname.replace(/^\/api\/edge-ssr\/article\//, ''));
  if (!slug) return new Response('Not found', { status: 404 });

  const fwd: Record<string,string> = {};
  for (const h of [
    'user-agent',
    'cf-ipcountry',
    'x-vercel-ip-country',
    'x-vercel-ip-country-region',
    'x-vercel-ip-city'
  ]) {
    const v = req.headers.get(h); if (v) fwd[h] = v;
  }

  const upstream = `${UPSTREAM}/ssr/article/${encodeURIComponent(slug)}`;
  const r = await fetch(upstream, { headers: fwd, redirect: 'manual' });

  if (r.status >= 300 && r.status < 400) {
    const loc = r.headers.get('location') || `/article/${slug}`;
    return Response.redirect(loc, r.status);
  }
  if (!r.ok) {
    return new Response(await r.text().catch(()=>'SSR failed'), {
      status: r.status,
      headers: { 'content-type':'text/plain; charset=utf-8','cache-control':'no-store' }
    });
  }

  const headers = new Headers(r.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control','public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  headers.set('vary','CF-IPCountry, X-Vercel-IP-Country, X-Vercel-IP-Country-Region, X-Vercel-IP-City, User-Agent');

  return new Response(r.body, { status: 200, headers });
}
