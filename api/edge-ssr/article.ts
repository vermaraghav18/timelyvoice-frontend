export const config = { runtime: "edge" };

const BACKEND = process.env.BACKEND_ORIGIN ?? "https://timelyvoice-backend.onrender.com";

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return new Response("Missing slug", { status: 400 });

  try {
    // Fetch JSON instead of HTML
    const r = await fetch(`${BACKEND}/api/articles/${slug}`);
    if (!r.ok) return new Response("Not found", { status: 404 });
    const article = await r.json();

    const html = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${article.title} – The Timely Voice</title>
  <meta name="description" content="${article.description}" />
  <link rel="canonical" href="https://timelyvoice.com/article/${slug}" />
  <meta property="og:title" content="${article.title}" />
  <meta property="og:image" content="${article.image}" />
  <meta property="og:description" content="${article.description}" />
  <meta property="og:url" content="https://timelyvoice.com/article/${slug}" />
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.description,
    image: [article.image],
    datePublished: article.createdAt,
    dateModified: article.updatedAt,
    author: [{ "@type": "Person", name: article.author || "Desk" }],
    publisher: {
      "@type": "Organization",
      name: "The Timely Voice",
      logo: { "@type": "ImageObject", url: "https://timelyvoice.com/logo.png" }
    },
    url: `https://timelyvoice.com/article/${slug}`
  })}
  </script>
</head>
<body>
  <article style="max-width:800px;margin:0 auto;padding:24px;font-family:system-ui;">
    <h1>${article.title}</h1>
    ${article.contentHtml || article.body || "<p>No content found.</p>"}
  </article>
</body>
</html>`;

    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  } catch (err) {
    console.error(err);
    return new Response("SSR failed", { status: 500 });
  }
}
