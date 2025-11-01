// api/edge-ssr/article/[slug].ts
export const config = { runtime: 'edge' };

const BACKEND = 'https://timelyvoice-backend.onrender.com';

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.pathname.split('/').pop() || '';
    // Only let bots/crawlers use SSR HTML; humans get SPA
    const ua = (req.headers.get('user-agent') || '').toLowerCase();
    const isBot = /googlebot|adsbot|bingbot|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot/.test(ua);

    const target = isBot
      ? `${BACKEND}/ssr/article/${encodeURIComponent(slug)}`
      : `${BACKEND}/article/${encodeURIComponent(slug)}`; // fallback or you can just 302 to your SPA

    const r = await fetch(target, {
      headers: {
        'x-forwarded-host': url.host,
        'x-forwarded-proto': url.protocol.replace(':', ''),
      }
    });

    // Pass through HTML or JSON as-is
    return new Response(await r.body, {
      status: r.status,
      headers: r.headers
    });
  } catch (e: any) {
    return new Response('Edge SSR proxy failed', { status: 502 });
  }
}
