export const config = { runtime: "edge" };

export default async function handler() {
  return new Response("edge-ok", {
    status: 200,
    headers: { "content-type": "text/plain" }
  });
}
