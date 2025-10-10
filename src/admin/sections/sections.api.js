// uses your fetch helpers
import { apiGET, apiJSON } from "../../lib/api.js";

export async function listSections() {
  return apiGET("/api/sections");
}

export async function createSection(payload) {
  return apiJSON("POST", "/api/sections", payload);
}

export async function updateSection(id, payload) {
  return apiJSON("PATCH", `/api/sections/${id}`, payload);
}

export async function deleteSection(id) {
  return apiJSON("DELETE", `/api/sections/${id}`);
}

// Search articles by text. Supports pagination if needed later.
export async function searchArticles(query, limit = 10) {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("q", query.trim());
  params.set("limit", String(limit));

  const res = await fetch(`/api/articles?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to search articles");
  return await res.json(); // expecting { items: [...], total: N } or an array
}

