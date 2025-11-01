// frontend/src/admin/articles/ImportModal.jsx
import { useState } from "react";
import axios from "axios";

export default function ImportModal({ onClose }) {
  const [jsonText, setJsonText] = useState("");
  const [strategy, setStrategy] = useState("cloudinary"); // 'cloudinary' | 'stock'
  const [preview, setPreview] = useState([]);             // [{ index, title, imageUrl, imagePublicId, ogImage }]
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [importing, setImporting] = useState(false);

  const parseItems = () => {
    try {
      const items = JSON.parse(jsonText);
      if (!Array.isArray(items)) throw new Error("JSON must be an array of articles");
      return items;
    } catch (e) {
      alert("Invalid JSON: " + e.message);
      return null;
    }
  };

  const handlePreview = async () => {
    const items = parseItems();
    if (!items) return;

    try {
      setLoadingPrev(true);
      setPreview([]);

      const res = await axios.post("/api/admin/articles/preview-import", {
        imageStrategy: strategy,
        items,
      });

      if (!res.data?.ok) {
        throw new Error(res.data?.error || "Preview failed");
      }
      setPreview(res.data.previews || []);
    } catch (err) {
      alert("Preview failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoadingPrev(false);
    }
  };

  const handleImport = async () => {
    const items = parseItems();
    if (!items) return;

    try {
      setImporting(true);
      const payload = {
        imageStrategy: strategy,
        continueOnError: true,
        items,
      };
      const res = await axios.post("/api/admin/articles/import", payload);
      alert(`Imported ${res.data?.results?.length || 0} items.`);
      onClose();
    } catch (err) {
      alert("Import failed: " + (err.response?.data?.error || err.message));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Bulk JSON Import</h2>

      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        rows={10}
        className="w-full border rounded p-2 font-mono text-sm"
        placeholder='Paste an array of articles [...]'
      />

      {/* Image strategy */}
      <div>
        <label className="block text-sm font-medium mb-1">Image Strategy</label>
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="border rounded p-1"
        >
          <option value="cloudinary">Cloudinary (auto pick)</option>
          <option value="stock">Default Image (fallback)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Cloudinary → auto-pick from your library.<br />
          If none found, your default Cloudinary image is attached.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          className="px-3 py-1 rounded border"
          disabled={loadingPrev}
        >
          {loadingPrev ? "Previewing…" : "Preview Images"}
        </button>
        <div className="flex-1" />
        <button onClick={onClose} className="px-3 py-1 rounded border">
          Cancel
        </button>
        <button
          onClick={handleImport}
          className="px-3 py-1 rounded bg-emerald-600 text-white"
          disabled={importing}
        >
          {importing ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Preview grid */}
      {preview.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Preview ({preview.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {preview.map((p) => (
              <div key={p.index} className="border rounded p-2">
                <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2">
                  {/* Use ogImage if present, else imageUrl */}
                  { (p.ogImage || p.imageUrl) ? (
                    <img
                      src={p.ogImage || p.imageUrl}
                      alt={p.imageAlt || p.title || ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-xs text-gray-400">
                      No image
                    </div>
                  ) }
                </div>
                <div className="text-xs font-medium line-clamp-2">{p.title || '(no title)'}</div>
                {p.imagePublicId && (
                  <div className="text-[10px] text-gray-500 break-all mt-1">
                    {p.imagePublicId}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
