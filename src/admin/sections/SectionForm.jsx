// frontend/src/admin/sections/SectionForm.jsx
import { useState, useMemo } from "react";
import { searchArticles } from "./sections.api.js";

export default function SectionForm({ initial = {}, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial.title || "",
    slug: initial.slug || "",
    template: initial.template || "head_v1",
    capacity: initial.capacity ?? 6,
    target: initial.target || { type: "homepage", value: "/" },
    feed:
      initial.feed || {
        mode: "auto",
        sortBy: "publishedAt",
        categories: [],
        tags: [],
        timeWindowHours: 0,
      },
    pins: initial.pins || [],  
    
    moreLink: initial.moreLink || "",
    enabled: initial.enabled ?? true,
    placementIndex: initial.placementIndex ?? 0,

    // rail side
    side: initial.side || "", // "", "left", "right"

    // simple custom (rail_v7 / rail_v8 etc.)
    custom:
      initial.custom || {
        imageUrl: "",
        alt: "",
        linkUrl: "",
        aspect: "16/9",
      },
  });

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Local state for Pins search UI
const [pinQuery, setPinQuery] = useState("");
const [pinResults, setPinResults] = useState([]);
const [pinLoading, setPinLoading] = useState(false);

  const isSingleCapTemplate = useMemo(
    () =>
      form.template === "hero_v1" ||
      form.template === "feature_v1" ||
      form.template === "rail_v7" ||
      form.template === "rail_v8",
    [form.template]
  );

  const catCsv = (form.feed?.categories || []).join(", ");
  const tagCsv = (form.feed?.tags || []).join(", ");

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.template === "rail_v7" && !form.custom?.imageUrl?.trim()) {
      alert("Image URL is required for Rail v7");
      return;
    }

    if (form.template === "rail_v8") {
      const c = form.custom || {};
      if (!c.imageUrl?.trim() || !c.title?.trim() || !c.summary?.trim()) {
        alert("Image, Title, and Summary are required for Rail v8");
        return;
      }
    }

    const payload = {
      ...form,
      capacity: isSingleCapTemplate ? 1 : form.capacity,
    };
    await onSubmit(payload);
  }

  const isRail = form.template?.startsWith?.("rail_");

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          className="border rounded p-2 w-full"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Slug</label>
        <input
          className="border rounded p-2 w-full"
          value={form.slug}
          onChange={(e) => update("slug", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Template</label>
          <select
            className="border rounded p-2 w-full"
            value={form.template}
            onChange={(e) => {
              const t = e.target.value;
              update("template", t);
              if (
                t === "hero_v1" ||
                t === "feature_v1" ||
                t === "rail_v7" ||
                t === "rail_v8"
              ) {
                update("capacity", 1);
              }
            }}
          >
            <option value="head_v1">Head (v1)</option>
            <option value="head_v2">Head (v2)</option>
            <option value="top_v1">Top (v1) – Composite</option>
            <option value="grid_v1">Grid (v1)</option>
            <option value="carousel_v1">Carousel (v1)</option>
            <option value="list_v1">List (v1) – More Headlines</option>
            <option value="hero_v1">Hero (v1) – Single Article</option>
            <option value="feature_v1">Feature (v1) – Wide Left Image</option>
            <option value="feature_v2">Feature (v2) – Read More</option>
            <option value="mega_v1">Mega (v1) – Hero + Strip</option>
            <option value="breaking_v1">Breaking (v1) – Live</option>
            <option value="dark_v1">Dark (v1) – Hero + Strip</option>

            <option value="main_v1">Main (v1)</option>
            <option value="main_v2">Main (v2)</option>
            <option value="main_v3">Main (v3)</option>
            <option value="main_v4">Main (v4)</option>
            <option value="main_v5">Main (v5)</option>
            <option value="main_v6">Main (v6)</option>
            <option value="main_v7">Main (v7)</option>

            <option value="rail_v3">Rail (v3)</option>
            <option value="rail_v4">Rail (v4)</option>
            <option value="rail_v5">Rail (v5) – News Feed</option>
            <option value="rail_v6">Rail (v6) – Lead + Stack</option>
            <option value="rail_v7">Rail (v7) – Image Promo</option>
            <option value="rail_v8">Rail (v8) – News Card</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Capacity</label>
         <input
            type="number"
            min={1}
            max={24} 
            className="border rounded p-2 w-full"
            value={isSingleCapTemplate ? 1 : form.capacity}
            onChange={(e) => update("capacity", Number(e.target.value))}
            disabled={isSingleCapTemplate}
          />

          {isSingleCapTemplate && (
            <p className="text-xs text-gray-500 mt-1">
              This template shows exactly one item (capacity fixed to 1).
            </p>
          )}
        </div>
      </div>

      {/* Side (for rails) */}
      {isRail && (
        <div>
          <label className="block text-sm font-medium">Side (rail)</label>
          <select
            className="border rounded p-2 w-full"
            value={form.side || ""}
            onChange={(e) => update("side", e.target.value)}
          >
            <option value="">(inherit/unused)</option>
            <option value="right">right</option>
            <option value="left">left</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Choose which rail column to render this section into.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Target Type</label>
          <select
            className="border rounded p-2 w-full"
            value={form.target?.type}
            onChange={(e) =>
              update("target", { ...(form.target || {}), type: e.target.value })
            }
          >
            <option value="homepage">homepage</option>
            <option value="path">path</option>
            <option value="category">category</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Target Value</label>
          <input
            className="border rounded p-2 w-full"
            value={form.target?.value || "/"}
            onChange={(e) =>
              update("target", { ...(form.target || {}), value: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium">Feed Mode</label>
          <select
            className="border rounded p-2 w-full"
            value={form.feed?.mode}
            onChange={(e) =>
              update("feed", { ...(form.feed || {}), mode: e.target.value })
            }
          >
            <option value="auto">auto</option>
            <option value="manual">manual</option>
            <option value="mixed">mixed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Sort By</label>

          <select
            className="border rounded p-2 w-full"
            value={form.feed?.sortBy}
            onChange={(e) =>
              update("feed", { ...(form.feed || {}), sortBy: e.target.value })
            }
          >
            <option value="publishedAt">publishedAt</option>
            <option value="priority">priority</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Time Window (hours)</label>
          <input
            type="number"
            min={0}
            className="border rounded p-2 w-full"
            value={form.feed?.timeWindowHours ?? 0}
            onChange={(e) =>
              update("feed", {
                ...(form.feed || {}),
                timeWindowHours: Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      {/* Optional simple filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">
            Categories (comma-separated)
          </label>
        <input
            className="border rounded p-2 w-full"
            placeholder="e.g. Sports, Tech"
            value={catCsv}
            onChange={(e) =>
              update("feed", {
                ...(form.feed || {}),
                categories: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Tags (comma-separated)</label>
          <input
            className="border rounded p-2 w-full"
            placeholder="e.g. Elections, AI"
            value={tagCsv}
            onChange={(e) =>
              update("feed", {
                ...(form.feed || {}),
                tags: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">More Link</label>
        <input
          className="border rounded p-2 w-full"
          value={form.moreLink}
          onChange={(e) => update("moreLink", e.target.value)}
        />
      </div>
      {/* =========================
    Pinned Articles (manual/mixed)
   ========================= */}
{(form.feed?.mode === "manual" || form.feed?.mode === "mixed") && (
  <fieldset className="border rounded p-3 space-y-3">
    <legend className="px-1 text-sm font-medium">Pinned articles (order = position)</legend>

    {/* Search bar */}
    <div className="flex gap-2">
      <input
        className="border rounded p-2 w-full"
        placeholder="Search articles by title or text…"
        value={pinQuery}
        onChange={(e) => setPinQuery(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            try {
              setPinLoading(true);
              const res = await searchArticles(pinQuery, 10);
              setPinResults(Array.isArray(res) ? res : (res.items || []));
            } finally {
              setPinLoading(false);
            }
          }
        }}
      />
      <button
        type="button"
        className="px-3 py-2 border rounded"
        onClick={async () => {
          try {
            setPinLoading(true);
            const res = await searchArticles(pinQuery, 10);
            setPinResults(Array.isArray(res) ? res : (res.items || []));
          } finally {
            setPinLoading(false);
          }
        }}
      >
        {pinLoading ? "Searching…" : "Search"}
      </button>
    </div>

    {/* Search results */}
    {pinResults?.length > 0 && (
      <div className="border rounded p-2">
        <div className="text-xs text-gray-600 mb-2">Results</div>
        <ul className="space-y-2">
          {pinResults.map((a) => (
            <li key={a.id || a._id || a.slug} className="flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-gray-500 truncate">{a.slug || a.id || a._id}</div>
              </div>
              <button
                type="button"
                className="px-2 py-1 rounded border"
                onClick={() => {
                  const articleId = String(a.id || a._id);
                  if (!articleId) return;
                  // avoid duplicates
                  if ((form.pins || []).some(p => String(p.articleId) === articleId)) return;
                  update("pins", [...(form.pins || []), { articleId }]);
                }}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Pinned list (ordered = positions) */}
    <div className="border rounded p-2">
      <div className="text-xs text-gray-600 mb-2">
        Order decides position: 0 = Lead, 1–9 = Right column, 10–11 = Bottom tiles.
      </div>

      {(!form.pins || form.pins.length === 0) ? (
        <div className="text-sm text-gray-500">No pins yet. Search above and click Add.</div>
      ) : (
        <ul className="space-y-2">
          {form.pins.map((p, idx) => (
            <li key={`${p.articleId}-${idx}`} className="flex items-center gap-2">
              <span className="text-xs w-6 text-gray-500">{idx}</span>

              {/* Article id display */}
              <input
                className="border rounded p-1 flex-1 text-xs"
                value={p.articleId}
                onChange={(e) => {
                  const pins = [...form.pins];
                  pins[idx] = { ...pins[idx], articleId: e.target.value };
                  update("pins", pins);
                }}
              />

              {/* Optional date range */}
              <input
                type="datetime-local"
                className="border rounded p-1 text-xs"
                value={p.startAt ? p.startAt.slice(0, 16) : ""}
                onChange={(e) => {
                  const pins = [...form.pins];
                  pins[idx] = { ...pins[idx], startAt: e.target.value ? new Date(e.target.value).toISOString() : undefined };
                  update("pins", pins);
                }}
                title="Start at (optional)"
              />
              <input
                type="datetime-local"
                className="border rounded p-1 text-xs"
                value={p.endAt ? p.endAt.slice(0, 16) : ""}
                onChange={(e) => {
                  const pins = [...form.pins];
                  pins[idx] = { ...pins[idx], endAt: e.target.value ? new Date(e.target.value).toISOString() : undefined };
                  update("pins", pins);
                }}
                title="End at (optional)"
              />

              {/* Reorder: up/down */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="px-2 py-1 border rounded"
                  disabled={idx === 0}
                  onClick={() => {
                    const pins = [...form.pins];
                    [pins[idx - 1], pins[idx]] = [pins[idx], pins[idx - 1]];
                    update("pins", pins);
                  }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="px-2 py-1 border rounded"
                  disabled={idx === form.pins.length - 1}
                  onClick={() => {
                    const pins = [...form.pins];
                    [pins[idx], pins[idx + 1]] = [pins[idx + 1], pins[idx]];
                    update("pins", pins);
                  }}
                  title="Move down"
                >
                  ↓
                </button>
              </div>

              {/* Remove */}
              <button
                type="button"
                className="px-2 py-1 border rounded"
                onClick={() => {
                  const pins = [...form.pins];
                  pins.splice(idx, 1);
                  update("pins", pins);
                }}
                title="Remove"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Capacity hint */}
    <p className="text-xs text-gray-500">
      Tip: Set capacity to the number of items you want shown (e.g., 12 for full head_v1).
    </p>
  </fieldset>
)}


      {/* ================================
          Top (v1) – Composite controls
          ================================ */}
      {form.template === "top_v1" && (
        <div className="border rounded p-3 space-y-3">
          <div className="font-semibold">Top v1 settings</div>

          {/* De-dupe */}
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.custom?.dedupeAcrossZones}
              onChange={(e) =>
                update("custom", {
                  ...(form.custom || {}),
                  dedupeAcrossZones: e.target.checked,
                })
              }
            />
            De-dupe across zones
          </label>

          {/* TOP STRIP */}
          <fieldset className="border rounded p-2">
            <legend className="px-1 text-sm font-medium">Top strip (4)</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                Categories (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.topStrip?.query?.categories || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      topStrip: {
                        ...(form.custom?.topStrip || {}),
                        limit: 4,
                        query: {
                          ...(form.custom?.topStrip?.query || {}),
                          categories: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Tags (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.topStrip?.query?.tags || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      topStrip: {
                        ...(form.custom?.topStrip || {}),
                        limit: 4,
                        query: {
                          ...(form.custom?.topStrip?.query || {}),
                          tags: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
          </fieldset>

          {/* LEAD */}
          <fieldset className="border rounded p-2">
            <legend className="px-1 text-sm font-medium">Lead (1)</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                Categories (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.lead?.query?.categories || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      lead: {
                        ...(form.custom?.lead || {}),
                        query: {
                          ...(form.custom?.lead?.query || {}),
                          categories: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Tags (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.lead?.query?.tags || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      lead: {
                        ...(form.custom?.lead || {}),
                        query: {
                          ...(form.custom?.lead?.query || {}),
                          tags: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
          </fieldset>

          {/* RIGHT STACK (2) */}
          <fieldset className="border rounded p-2">
            <legend className="px-1 text-sm font-medium">Right stack (2)</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">
                Categories (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.rightStack?.query?.categories || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      rightStack: {
                        ...(form.custom?.rightStack || {}),
                        limit: 2,
                        query: {
                          ...(form.custom?.rightStack?.query || {}),
                          categories: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="text-sm">
                Tags (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.rightStack?.query?.tags || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      rightStack: {
                        ...(form.custom?.rightStack || {}),
                        limit: 2,
                        query: {
                          ...(form.custom?.rightStack?.query || {}),
                          tags: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
          </fieldset>

          {/* FRESH STORIES — with Layout / Title / Height */}
          <fieldset className="border rounded p-2">
            <legend className="px-1 text-sm font-medium">Fresh stories (scroll)</legend>

            <div className="grid grid-cols-3 gap-2">
              <label className="text-sm">
                Limit
                <input
                  type="number"
                  className="border p-1 w-full"
                  value={form.custom?.freshStories?.limit ?? 10}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      freshStories: {
                        ...(form.custom?.freshStories || {}),
                        limit: Number(e.target.value || 10),
                      },
                    })
                  }
                />
              </label>

              <label className="text-sm">
                Layout
                <select
                  className="border p-1 w-full"
                  value={form.custom?.freshStories?.layout || "compact"}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      freshStories: {
                        ...(form.custom?.freshStories || {}),
                        layout: e.target.value, // "compact" | "compact+thumb"
                      },
                    })
                  }
                >
                  <option value="compact">compact (no image)</option>
                  <option value="compact+thumb">compact + thumbnail</option>
                </select>
              </label>

              <label className="text-sm">
                Max height (px)
                <input
                  type="number"
                  className="border p-1 w-full"
                  value={form.custom?.freshStories?.maxHeight ?? 520}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      freshStories: {
                        ...(form.custom?.freshStories || {}),
                        maxHeight: Number(e.target.value || 520),
                      },
                    })
                  }
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-sm">
                Panel title
                <input
                  className="border p-1 w-full"
                  value={form.custom?.freshStories?.panelTitle ?? "Fresh stories"}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      freshStories: {
                        ...(form.custom?.freshStories || {}),
                        panelTitle: e.target.value,
                      },
                    })
                  }
                />
              </label>

              <label className="text-sm">
                Categories (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.freshStories?.query?.categories || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      freshStories: {
                        ...(form.custom?.freshStories || {}),
                        query: {
                          ...(form.custom?.freshStories?.query || {}),
                          categories: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
          </fieldset>

          {/* POPULAR — with Layout / Title / Height */}
          <fieldset className="border rounded p-2">
            <legend className="px-1 text-sm font-medium">Popular (scroll)</legend>

            <div className="grid grid-cols-3 gap-2">
              <label className="text-sm">
                Limit
                <input
                  type="number"
                  className="border p-1 w-full"
                  value={form.custom?.popular?.limit ?? 10}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      popular: {
                        ...(form.custom?.popular || {}),
                        limit: Number(e.target.value || 10),
                      },
                    })
                  }
                />
              </label>

              <label className="text-sm">
                Layout
                <select
                  className="border p-1 w-full"
                  value={form.custom?.popular?.layout || "compact"}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      popular: {
                        ...(form.custom?.popular || {}),
                        layout: e.target.value, // "compact" | "compact+thumb"
                      },
                    })
                  }
                >
                  <option value="compact">compact (no image)</option>
                  <option value="compact+thumb">compact + thumbnail</option>
                </select>
              </label>

              <label className="text-sm">
                Max height (px)
                <input
                  type="number"
                  className="border p-1 w-full"
                  value={form.custom?.popular?.maxHeight ?? 520}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      popular: {
                        ...(form.custom?.popular || {}),
                        maxHeight: Number(e.target.value || 520),
                      },
                    })
                  }
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-sm">
                Panel title
                <input
                  className="border p-1 w-full"
                  value={form.custom?.popular?.panelTitle ?? "Popular"}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      popular: {
                        ...(form.custom?.popular || {}),
                        panelTitle: e.target.value,
                      },
                    })
                  }
                />
              </label>

              <label className="text-sm">
                Categories (CSV)
                <input
                  className="border p-1 w-full"
                  value={(form.custom?.popular?.query?.categories || []).join(", ")}
                  onChange={(e) =>
                    update("custom", {
                      ...(form.custom || {}),
                      popular: {
                        ...(form.custom?.popular || {}),
                        query: {
                          ...(form.custom?.popular?.query || {}),
                          categories: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
          </fieldset>
        </div>
      )}

      {/* rail_v7 */}
      {form.template === "rail_v7" && (
        <fieldset style={{ border: "1px solid #eee", padding: 12, marginTop: 10 }}>
          <legend>Promo Image</legend>

          <label>Image URL</label>
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={form.custom?.imageUrl || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), imageUrl: e.target.value },
              }))
            }
            placeholder="https://cdn.example.com/.../image.png or /images/promo.png"
            required
            pattern="(https?:\/\/.*|\/.*)"
            title="Enter http(s) URL or a site-relative path starting with /"
          />

          <label style={{ marginTop: 8 }}>Alt text</label>
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={form.custom?.alt || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), alt: e.target.value },
              }))
            }
            placeholder="Short description"
          />

          <label style={{ marginTop: 8 }}>Click-through URL (optional)</label>
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={form.custom?.linkUrl || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), linkUrl: e.target.value },
              }))
            }
            placeholder="https://example.com/story"
            pattern="https?:\/\/.*"
            title="Use a full http(s) URL (e.g., https://example.com/page)"
          />

          <label style={{ marginTop: 8 }}>Aspect ratio</label>
          <select
            className="border rounded p-2 w-full"
            value={form.custom?.aspect || "16/9"}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), aspect: e.target.value },
              }))
            }
          >
            <option value="16/9">16:9 (wide)</option>
            <option value="1/1">1:1 (square)</option>
            <option value="4/3">4:3</option>
            <option value="3/4">3:4 (portrait)</option>
          </select>
        </fieldset>
      )}

      {/* rail_v8 */}
      {form.template === "rail_v8" && (
        <fieldset style={{ border: "1px solid #eee", padding: 12, marginTop: 10 }}>
          <legend>News Card</legend>

          <label>Image URL</label>
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={form.custom?.imageUrl || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), imageUrl: e.target.value },
              }))
            }
            placeholder="https://cdn.example.com/news-card.png or /images/card.png"
            required
            pattern="(https?:\/\/.*|\/.*)"
            title="Enter http(s) URL or a site-relative path starting with /"
          />

          <label style={{ marginTop: 8 }}>Title</label>
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={form.custom?.title || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), title: e.target.value },
              }))
            }
            placeholder="Headline for the card"
            required
          />

          <label style={{ marginTop: 8 }}>Summary</label>
          <textarea
            className="border rounded p-2 w-full"
            rows={3}
            value={form.custom?.summary || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), summary: e.target.value },
              }))
            }
            placeholder="One or two lines of summary"
            required
          />

          <label style={{ marginTop: 8 }}>Click-through URL (optional)</label>
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={form.custom?.linkUrl || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                custom: { ...(f.custom || {}), linkUrl: e.target.value },
              }))
            }
            placeholder="https://example.com/full-story"
            pattern="https?:\/\/.*"
            title="Use a full http(s) URL (e.g., https://example.com/page)"
          />
        </fieldset>
      )}

      <div className="grid grid-cols-3 gap-3">
        <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!form.enabled}
        onChange={(e) => update("enabled", e.target.checked)}
      />
      <span>Enabled</span>
    </label>


        <div>
          <label className="block text-sm font-medium">Placement Index</label>
          <input
            type="number"
            className="border rounded p-2 w-full"
            value={form.placementIndex}
            onChange={(e) => update("placementIndex", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 rounded bg-black text-white">
          Save
        </button>
        {onCancel && (
          <button
            type="button"
            className="px-4 py-2 rounded border"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
