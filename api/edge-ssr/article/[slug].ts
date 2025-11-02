// api/edge-ssr/article/[slug].ts
export const config = { runtime: 'edge' };

const BACKEND = 'https://timelyvoice-backend.onrender.com';

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.pathname.split('/').pop() || '';
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    const isBot =
      /googlebot|adsbot|bingbot|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot/.test(
        ua
      );

    const target = `${BACKEND}/${isBot ? 'ssr/article' : 'article'}/${encodeURIComponent(slug)}`;

    const r = await fetch(target, {
      headers: {
        'user-agent': ua,
        'x-forwarded-host': url.host,
        'x-forwarded-proto': url.protocol.replace(':', ''),
      },
    });

    // Pass through the stream; do NOT await r.body
    return new Response(r.body, { status: r.status, headers: r.headers });
  } catch {
    return new Response('Edge SSR proxy failed', { status: 502 });
  }
}
