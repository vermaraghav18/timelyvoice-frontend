export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const slug = new URL(req.url).pathname.split("/").pop() || "";
  return new Response(`edge-article-ok slug=${slug}`, {
    status: 200,
    headers: { "content-type": "text/plain" }
  });
}
