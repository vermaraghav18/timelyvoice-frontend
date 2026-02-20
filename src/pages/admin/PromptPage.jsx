// frontend/src/pages/admin/PromptPage.jsx
import React, { useEffect, useState } from "react";
import { api, styles } from "../../App.jsx";

export default function PromptPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/admin/prompt");
        if (!mounted) return;
        setPrompt(res.data?.prompt || "");
      } catch {
        if (!mounted) return;
        setMsg("Failed to load prompt.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  async function onSave() {
    try {
      setSaving(true);
      setMsg("");
      const res = await api.put("/admin/prompt", { prompt });
      setPrompt(res.data?.prompt || prompt);
      setMsg("Saved ✅");
    } catch {
      setMsg("Save failed ❌");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.nav}>
        <h2 style={{ margin: 0 }}>Daily Prompt</h2>
        <button style={styles.button} onClick={onSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <p style={styles.p}>
        Paste the prompt you use every morning. The <b>P</b> button (bottom-right) will copy this.
      </p>

      <hr style={styles.hr} />

      {loading ? (
        <div style={styles.card}>Loading...</div>
      ) : (
        <div style={styles.card}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={14}
            style={{
              ...styles.input,
              resize: "vertical",
              minHeight: 220,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.5,
            }}
            placeholder="Paste your daily prompt here..."
          />
          {msg ? <div style={{ marginTop: 10, fontWeight: 700 }}>{msg}</div> : null}
        </div>
      )}
    </div>
  );
}
