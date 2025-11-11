// frontend/src/pages/AdminX.jsx
// A minimal X Admin console: manage sources (handles) and run extract→generate→draft on items.
// Assumes React + React Router. No external libs.
// Works against the backend you already have running on :4000.

import React, { useEffect, useMemo, useState } from "react";

// Resolve API base: if you open from Vite (5173), talk to 4000. Otherwise same origin.
const guessBase = () => {
  try {
    const u = new URL(window.location.href);
    if (u.port === "5173") return `${u.protocol}//${u.hostname}:4000`;
    return `${u.protocol}//${u.host}`; // when served by backend in prod
  } catch {
    return "";
  }
};
const BASE = guessBase();

async function api(path, { method = "GET", json, rawBody } = {}) {
  const opts = { method, headers: {} };
  if (json) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(json);
  } else if (rawBody) {
    opts.body = rawBody;
  }
  const res = await fetch(BASE + path, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: res.ok, status: res.status, raw: text };
  }
}

function Section({ title, children, right }) {
  return (
    <section className="my-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {right}
      </div>
      <div className="rounded-xl border border-gray-200 p-3 bg-white/70">
        {children}
      </div>
    </section>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={
        "border rounded-lg px-3 py-2 outline-none focus:ring w-full " +
        (props.className || "")
      }
    />
  );
}

function Button({ children, variant = "primary", small, ...rest }) {
  const base =
    "rounded-lg px-3 " + (small ? "py-1 text-sm" : "py-2") +
    " disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: base + " bg-blue-600 text-white hover:bg-blue-700",
    ghost: base + " bg-white border border-gray-300 hover:bg-gray-50",
    danger: base + " bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button {...rest} className={(styles[variant] || styles.primary) + " " + (rest.className || "") }>
      {children}
    </button>
  );
}

function Badge({ children, color = "gray" }) {
  const map = {
    gray: "bg-gray-100 text-gray-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    violet: "bg-violet-100 text-violet-800",
  };
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded-md ${map[color] || map.gray}`}>{children}</span>
  );
}

function useAsyncList(loadFn, deps = [], { pollMs } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = React.useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const rows = await loadFn();
      setData(rows || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => {
    reload();
    if (pollMs) {
      const id = setInterval(reload, pollMs);
      return () => clearInterval(id);
    }
  }, [reload, pollMs]);

  return { data, loading, error, reload, setData };
}

function Sources() {
  const [form, setForm] = useState({ handle: "", label: "", defaultAuthor: "Desk", defaultCategory: "Politics", enabled: true });

  const { data: rows, loading, error, reload, setData } = useAsyncList(async () => {
    const r = await api("/api/automation/x/sources");
    if (!r.ok) throw new Error(r.error || "Failed to list sources");
    return r.rows;
  }, [], { pollMs: 0 });

  const onCreate = async (e) => {
    e.preventDefault();
    const clean = { ...form, handle: form.handle.replace(/^@/, "") };
    const r = await api("/api/automation/x/sources", { method: "POST", json: clean });
    if (r.ok) {
      setForm({ handle: "", label: "", defaultAuthor: "Desk", defaultCategory: "Politics", enabled: true });
      await reload();
    } else {
      alert(r.error || "Create failed");
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this source?")) return;
    const r = await api(`/api/automation/x/sources/${id}`, { method: "DELETE" });
    if (r.ok) {
      setData((prev) => prev.filter((x) => x._id !== id));
    } else {
      alert(r.error || "Delete failed");
    }
  };

  const toggleEnabled = async (row) => {
    const r = await api(`/api/automation/x/sources/${row._id}`, { method: "PATCH", json: { enabled: !row.enabled } });
    if (r.ok) reload(); else alert(r.error || "Update failed");
  };

  const fetchNow = async (row) => {
    const r = await api(`/api/automation/x/sources/${row._id}/fetch`, { method: "POST" });
    if (r.ok) alert(`Fetched. new items: ${r.created}`); else alert(r.error || r.raw || "Fetch failed");
  };

  return (
    <Section title="X Sources (handles)" right={<Button variant="ghost" onClick={reload}>Refresh</Button>}>
      <form onSubmit={onCreate} className="grid md:grid-cols-6 gap-2 mb-3">
        <TextInput placeholder="handle (e.g. bbcworld)" value={form.handle} onChange={(e)=>setForm(f=>({...f, handle:e.target.value}))} />
        <TextInput placeholder="Label (optional)" value={form.label} onChange={(e)=>setForm(f=>({...f, label:e.target.value}))} />
        <TextInput placeholder="Default Author" value={form.defaultAuthor} onChange={(e)=>setForm(f=>({...f, defaultAuthor:e.target.value}))} />
        <TextInput placeholder="Default Category" value={form.defaultCategory} onChange={(e)=>setForm(f=>({...f, defaultCategory:e.target.value}))} />
        <div className="flex items-center gap-2">
          <input id="enb" type="checkbox" checked={form.enabled} onChange={(e)=>setForm(f=>({...f, enabled:e.target.checked}))} />
          <label htmlFor="enb">Enabled</label>
        </div>
        <Button type="submit">Add Source</Button>
      </form>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Handle</th>
              <th>Label</th>
              <th>Enabled</th>
              <th>Default</th>
              <th>sinceId</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium">@{r.handle}</td>
                <td>{r.label}</td>
                <td>{r.enabled ? <Badge color="green">on</Badge> : <Badge color="red">off</Badge>}</td>
                <td><span title={`Author: ${r.defaultAuthor}\nCategory: ${r.defaultCategory}`}>{r.defaultAuthor} / {r.defaultCategory}</span></td>
                <td className="text-xs text-gray-500">{r.sinceId || "-"}</td>
                <td className="flex flex-wrap gap-2 py-2">
                  <Button variant="ghost" small onClick={()=>toggleEnabled(r)}>{r.enabled?"Disable":"Enable"}</Button>
                  <Button variant="ghost" small onClick={()=>fetchNow(r)}>Fetch</Button>
                  <Button variant="danger" small onClick={()=>onDelete(r._id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500">No sources yet. Add a handle above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Items() {
  const [limit, setLimit] = useState(50);
  const [sinceHours, setSinceHours] = useState(48);
  const [handle, setHandle] = useState("");

  const query = useMemo(() => ({ limit, sinceHours, handle: handle.trim().replace(/^@/, "") }), [limit, sinceHours, handle]);

  const { data: rows, loading, error, reload, setData } = useAsyncList(async () => {
    const q = new URLSearchParams({ limit: String(query.limit), sinceHours: String(query.sinceHours) });
    if (query.handle) q.append("handle", query.handle);
    const r = await api(`/api/automation/x/items?${q.toString()}`);
    if (!r.ok) throw new Error(r.error || "Failed to list items");
    return r.rows;
  }, [JSON.stringify(query)], { pollMs: 0 });

  const run = async (id) => {
    const r = await api(`/api/automation/x/items/${id}/run`, { method: "POST" });
    if (r.ok) {
      alert(`Draft created. articleId=${r.articleId}`);
      reload();
    } else {
      alert(r.error || "Run failed");
    }
  };
  const step = async (id, action) => {
    const r = await api(`/api/automation/x/items/${id}/${action}`, { method: "POST" });
    if (r.ok) {
      reload();
    } else {
      alert(r.error || `${action} failed`);
    }
  };

  return (
    <Section
      title="X Items"
      right={
        <div className="flex gap-2 items-center">
          <TextInput style={{width:180}} placeholder="filter handle (optional)" value={handle} onChange={(e)=>setHandle(e.target.value)} />
          <TextInput style={{width:100}} type="number" value={sinceHours} onChange={(e)=>setSinceHours(Number(e.target.value)||0)} />
          <TextInput style={{width:90}} type="number" value={limit} onChange={(e)=>setLimit(Number(e.target.value)||0)} />
          <Button variant="ghost" onClick={reload}>Refresh</Button>
        </div>
      }
    >
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">_id</th>
              <th>Handle</th>
              <th>Status</th>
              <th>Tweeted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=> (
              <tr key={r._id} className="border-b align-top">
                <td className="py-2 text-xs text-gray-600">{r._id}</td>
                <td className="font-medium">@{r.handle}</td>
                <td>{
                  r.status === 'generated' ? <Badge color="blue">generated</Badge> :
                  r.status === 'extracted' ? <Badge color="amber">extracted</Badge> :
                  r.status === 'drafted' ? <Badge color="violet">drafted</Badge> :
                  r.status === 'ready' ? <Badge color="green">ready</Badge> :
                  <Badge>{r.status||'-'}</Badge>
                }</td>
                <td className="text-xs">{new Date(r.tweetedAt).toLocaleString()}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button small variant="ghost" onClick={()=>step(r._id,'extract')}>Extract</Button>
                    <Button small variant="ghost" onClick={()=>step(r._id,'generate')}>Generate</Button>
                    <Button small variant="ghost" onClick={()=>step(r._id,'draft')}>Draft</Button>
                    <Button small onClick={()=>run(r._id)}>Run All</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">No items in window. Try Fetch on a source, broaden hours, or increase limit.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

export default function AdminXPage() {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">X Admin</h1>
      <p className="text-sm text-gray-600 mb-4">API base: <code>{BASE}</code></p>
      <Sources />
      <Items />
    </div>
  );
}
