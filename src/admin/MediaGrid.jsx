// frontend/src/admin/MediaGrid.jsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGET, authHeader } from "../lib/api";

export default function MediaGrid({ token, selectable = false, onSelect }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, totalPages: 0, pageSize: 20 });

  const H = useMemo(() => authHeader(token), [token]);

  async function load(p = page, query = q) {
    const encQ = query ? `&q=${encodeURIComponent(query)}` : "";
    const res = await apiGET(`/api/media?page=${p}&limit=20${encQ}`, H);
    setData(res);
  }

  useEffect(() => { load(1, ""); }, []); // initial

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Search by publicId or URL..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="border rounded px-3" onClick={() => load(1, q)}>Search</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.items.map((m) => (
          <div key={m._id} className="border rounded overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100">
              <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-2 text-xs">
              <div className="truncate">{m.publicId}</div>
              <div className="text-gray-500">{m.width}×{m.height} • {(m.bytes/1024).toFixed(1)} KB</div>
              {selectable ? (
                <button className="mt-2 w-full border rounded px-2 py-1" onClick={() => onSelect?.(m)}>
                  Select
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Total: {data.total}</div>
        <div className="flex gap-2">
          <button className="border rounded px-3 py-1" disabled={page <= 1} onClick={() => { const p = page-1; setPage(p); load(p, q); }}>
            Prev
          </button>
          <div className="text-sm">Page {page} / {Math.max(1, data.totalPages)}</div>
          <button className="border rounded px-3 py-1" disabled={page >= data.totalPages} onClick={() => { const p = page+1; setPage(p); load(p, q); }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
