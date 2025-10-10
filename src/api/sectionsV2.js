export async function listSectionsV2Public() {
  const r = await fetch("/api/sections-v2");
  const data = await r.json();
  data.sort((a, b) => a.side.localeCompare(b.side) || a.order - b.order);
  return data;
}
