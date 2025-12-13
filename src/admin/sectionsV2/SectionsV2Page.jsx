import { useEffect, useMemo, useState } from "react";
import { styles } from "../../App.jsx";
import { api } from "../../lib/publicApi";

const EMPTY = {
  key: "",
  title: "",
  type: "rail_list_v1",      // default to rail list
  side: "right",
  order: 1,
  enabled: true,
  source: null,              // e.g. { "type": "manual" }
  query: { limit: 10 },      // used when source.type !== 'manual'
  config: {},
  ui: {},
  items: [],                 // manual items array
};

const TEMPLATE_OPTS = [
  "rail_list_v1",
  "rail_list_v2",
  "rail_promo_square_v1",    // NEW template
   "rail_live_blog_v1",
  "head_v1",
  "head_v2",
  "grid_v1",
  "carousel_v1",
  "list_v1",
  "hero_v1",
  "feature_v1",
  "feature_v2",
  "mega_v1",
  "breaking_v1",
  "dark_v1",
];

export default function SectionsV2Page() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/api/admin/sections-v2");
      setRows(r.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      order: Number(form.order) || 0,
    };
    if (editingId) {
      await api.put(`/api/admin/sections-v2/${editingId}`, payload);
    } else {
      await api.post("/api/admin/sections-v2", payload);
    }
    setForm(EMPTY);
    setEditingId(null);
    await load();
  }

  function onEdit(row) {
    setEditingId(row._id);
    setForm({
      key: row.key || "",
      title: row.title || "",
      type: row.type || "rail_list_v1",
      side: row.side || "right",
      order: row.order ?? 1,
      enabled: !!row.enabled,
      source: row.source ?? null,
      query: row.query || { limit: 10 },
      config: row.config || {},
      ui: row.ui || {},
      items: Array.isArray(row.items) ? row.items : [],
    });
  }

  async function onDelete(id) {
    if (!confirm("Delete this section?")) return;
    await api.delete(`/api/admin/sections-v2/${id}`);
    await load();
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => a.side.localeCompare(b.side) || (a.order ?? 0) - (b.order ?? 0)
      ),
    [rows]
  );

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <h1 style={{ margin: 0 }}>Sections V2 (Right/Left Rails)</h1>
        {loading ? <span style={styles.badge}>Loading…</span> : null}
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>{editingId ? "Edit Section" : "Create Section"}</h3>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label>Key</label>
              <input
                style={styles.input}
                value={form.key}
                onChange={(e) => update("key", e.target.value)}
                placeholder="unique-key"
                required
              />
            </div>
            <div>
              <label>Title</label>
              <input
                style={styles.input}
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Section title"
              />
            </div>

            <div>
              <label>Template</label>
              <select
                style={styles.input}
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
              >
                {TEMPLATE_OPTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Side</label>
              <select
                style={styles.input}
                value={form.side}
                onChange={(e) => update("side", e.target.value)}
              >
                <option value="left">left</option>
                <option value="right">right</option>
              </select>
            </div>

            <div>
              <label>Order</label>
              <input
                style={styles.input}
                type="number"
                value={form.order}
                onChange={(e) => update("order", e.target.value)}
              />
            </div>

            <div>
              <label>Enabled</label>
              <select
                style={styles.input}
                value={form.enabled ? "1" : "0"}
                onChange={(e) => update("enabled", e.target.value === "1")}
              >
                <option value="1">true</option>
                <option value="0">false</option>
              </select>
            </div>

            {/* Source JSON */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Source (JSON) — e.g. {`{ "type": "manual" }`} or {`{ "type": "query" }`}</label>
              <textarea
                style={{ ...styles.input, height: 80 }}
                value={JSON.stringify(form.source ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    const obj = JSON.parse(e.target.value || "null");
                    update("source", obj);
                  } catch {
                    // ignore until valid
                  }
                }}
                placeholder='{"type":"manual"}'
              />
            </div>

            {/* Query JSON */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Query (JSON)</label>
              <textarea
                style={{ ...styles.input, height: 120 }}
                value={JSON.stringify(form.query, null, 2)}
                onChange={(e) => {
                  try {
                    const obj = JSON.parse(e.target.value || "{}");
                    update("query", obj);
                  } catch {
                    // ignore invalid until fixed
                  }
                }}
                placeholder='{"limit":10,"category":"latest"}'
              />
            </div>

            {/* Config JSON */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Config (JSON)</label>
              <textarea
                style={{ ...styles.input, height: 100 }}
                value={JSON.stringify(form.config, null, 2)}
                onChange={(e) => {
                  try {
                    const obj = JSON.parse(e.target.value || "{}");
                    update("config", obj);
                  } catch {
                    // ignore invalid until fixed
                  }
                }}
                placeholder='{"moreLink":"/latest"}'
              />
            </div>

            {/* UI JSON */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label>UI (JSON)</label>
              <textarea
                style={{ ...styles.input, height: 100 }}
                value={JSON.stringify(form.ui ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    const obj = JSON.parse(e.target.value || "{}");
                    update("ui", obj);
                  } catch {}
                }}
                placeholder='{"bg":"#000","textColor":"#fff","overlay":0.25,"ctaText":"READ HERE"}'
              />
            </div>

            {/* Items JSON (manual) */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Items (JSON) — only used when Source is manual</label>
              <textarea
                style={{ ...styles.input, height: 140 }}
                value={JSON.stringify(form.items ?? [], null, 2)}
                onChange={(e) => {
                  try {
                    const obj = JSON.parse(e.target.value || "[]");
                    update("items", obj);
                  } catch {
                    // ignore
                  }
                }}
                placeholder={`[
  {
    "title": "Those We Have Lost",
    "dek": "Civilians and soldiers who have fallen since Oct. 7",
    "url": "/special/those-we-have-lost",
    "image": { "url": "https://cdn.site.com/promo.jpg" },
    "ctaText": "READ HERE"
  }
]`}
              />
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button type="submit" style={styles.button}>
              {editingId ? "Save Changes" : "Create Section"}
            </button>
            <button type="button" style={styles.danger} onClick={reset}>
              Reset
            </button>
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <h3 style={styles.h3}>All Sections</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Side</th>
              <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Order</th>
              <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Key</th>
              <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Title</th>
              <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Type</th>
              <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Enabled</th>
              <th style={{ padding: 8, borderBottom: "1px solid #eee" }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r._id}>
                <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{r.side}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{r.order ?? 0}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{r.key}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{r.title}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{r.type}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
                  {r.enabled ? "true" : "false"}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
                  <button style={styles.button} onClick={() => onEdit(r)}>Edit</button>{" "}
                  <button style={styles.danger} onClick={() => onDelete(r._id)}>Delete</button>
                </td>
              </tr>
            ))}
            {!sorted.length && (
              <tr>
                <td colSpan="7" style={{ padding: 12, color: "#666" }}>
                  No sections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
