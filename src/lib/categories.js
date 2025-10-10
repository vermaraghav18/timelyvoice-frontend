// src/lib/categories.js
import { api } from "../App";

let cache = { at: 0, list: [] };

export async function getCategoriesCached(maxAgeMs = 60_000) {
  const now = Date.now();
  if (cache.list.length && now - cache.at < maxAgeMs) return cache.list;

  const res = await api.get("/api/categories", { params: { limit: 1000 } });
  const raw = Array.isArray(res.data) ? res.data : (res.data.items || []);
  cache = { at: now, list: raw };
  return raw;
}

export function buildCatMaps(list = []) {
  // Creates lookups: bySlug[slug] = Name, byName[nameLower] = slug
  const bySlug = {};
  const byName = {};
  for (const c of list) {
    const name = c.name || "";
    const slug = c.slug || "";
    if (!slug) continue;
    bySlug[slug] = name || slug;
    if (name) byName[name.toLowerCase()] = slug;
  }
  return { bySlug, byName };
}
