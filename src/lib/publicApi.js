// frontend/src/lib/publicApi.js
import axios from "axios";

// Use relative base by default; Vite proxy forwards /api in dev
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// -------------------------
// Ultra-light GET cache
// -------------------------
const _cache = new Map(); // key -> { t, ttl, data }
const _inflight = new Map(); // key -> Promise

function makeKey(url, config) {
  const params = config?.params ? JSON.stringify(config.params) : "";
  return `${url}::${params}`;
}

/**
 * cachedGet(url, { params }, ttlMs)
 * - Dedupes concurrent calls
 * - Caches successful responses for ttlMs
 */
export async function cachedGet(url, config = {}, ttlMs = 30_000) {
  const key = makeKey(url, config);
  const now = Date.now();

  const hit = _cache.get(key);
  if (hit && now - hit.t < hit.ttl) return hit.data;

  const existing = _inflight.get(key);
  if (existing) return existing;

  const p = api
    .get(url, config)
    .then((res) => {
      const data = res?.data;
      _cache.set(key, { t: Date.now(), ttl: ttlMs, data });
      return data;
    })
    .finally(() => _inflight.delete(key));

  _inflight.set(key, p);
  return p;
}
