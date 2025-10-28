// src/admin/ArticlesBulkImport.jsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api, styles, getToken, setToken } from "../App.jsx";

const NDJSON_SAMPLE = [
  {
    title: "Bulk Demo One",
    summary: "Short summary one",
    author: "Newsdesk",
    body: "Full content of the first article.",
    category: "Tech",
    tags: ["ai", "release"],
  },
  {
    title: "Bulk Demo Two",
    summary: "Short summary two",
    author: "Newsdesk",
    body: "Second article body.",
    category: "Sports",
    tags: ["cricket"],
  },
]
  .map((o) => JSON.stringify(o))
  .join("\n");

const JSON_ARRAY_SAMPLE = JSON.stringify(
  [
    {
      title: "Bulk Demo One",
      summary: "Short summary one",
      author: "Newsdesk",
      body: "Full content of the first article.",
      category: "Tech",
      tags: ["ai", "release"],
    },
    {
      title: "Bulk Demo Two",
      summary: "Short summary two",
      author: "Newsdesk",
      body: "Second article body.",
      category: "Sports",
      tags: ["cricket"],
    },
  ],
  null,
  2
);

export default function AdminArticlesBulkImport() {
  // ui state
  const [format, setFormat] = useState("ndjson"); // 'ndjson' | 'json'
  const [dryRun, setDryRun] = useState(true);
  const [continueOnError, setContinueOnError] = useState(true);
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // token helpers (read from localStorage on mount)
  const [tokenField, setTokenField] = useState(getToken() || "");
  const token = useMemo(() => tokenField.trim(), [tokenField]);

  function persistToken() {
    if (token) setToken(token);
  }

  function loadNdjson() {
    setFormat("ndjson");
    setPayload(NDJSON_SAMPLE);
    setResult(null);
    setErrorMsg("");
  }

  function loadJsonArray() {
    setFormat("json");
    setPayload(JSON_ARRAY_SAMPLE);
    setResult(null);
    setErrorMsg("");
  }

  async function handleRun() {
    setBusy(true);
    setResult(null);
    setErrorMsg("");
    try {
      // ensure token is saved so interceptors can pick it up too
      persistToken();

      // build body + content-type
      let bodyToSend = "";
      let contentType = "application/x-ndjson";

      if (format === "ndjson") {
        // raw NDJSON string (one JSON object per line)
        bodyToSend = String(payload ?? "").trim();
        if (!bodyToSend) throw new Error("Payload is empty.");
      } else {
        // JSON array
        contentType = "application/json";
        let parsed = null;
        try {
          parsed = JSON.parse(String(payload ?? ""));
        } catch (e) {
          throw new Error("JSON is invalid. Please paste a valid JSON array.");
        }
        if (!Array.isArray(parsed)) {
          throw new Error("JSON payload must be an array of objects.");
        }
        bodyToSend = JSON.stringify(parsed);
      }

      const url = `/api/articles/bulk?dryRun=${dryRun ? 1 : 0}&continueOnError=${
        continueOnError ? 1 : 0
      }`;

      const headers = { "Content-Type": contentType };
      if (token) headers.Authorization = `Bearer ${token}`;

      const { data } = await api.post(url, bodyToSend, { headers });
      setResult(data);
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || e?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...styles.page, maxWidth: 1100 }}>
      <div style={{ ...styles.nav, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Bulk Import Articles</h2>
        <span style={styles.muted}>POST /api/articles/bulk</span>
      </div>

      <div style={styles.card}>
        <p style={{ ...styles.p, marginTop: 0 }}>
          Format
          <span style={styles.badge}>NDJSON</span>
          <span style={{ marginLeft: 8 }}>or</span>
          <span style={{ ...styles.badge, marginLeft: 8 }}>JSON array</span>
        </p>

        <div style={{ margin: "10px 0" }}>
          <label style={{ marginRight: 16 }}>
            <input
              type="radio"
              name="fmt"
              value="ndjson"
              checked={format === "ndjson"}
              onChange={() => setFormat("ndjson")}
            />{" "}
            NDJSON
          </label>
          <label>
            <input
              type="radio"
              name="fmt"
              value="json"
              checked={format === "json"}
              onChange={() => setFormat("json")}
            />{" "}
            JSON array
          </label>
        </div>

        <div style={{ marginBottom: 8 }}>
          <button style={styles.button} onClick={loadNdjson} disabled={busy}>
            Load NDJSON sample
          </button>{" "}
          <button style={styles.button} onClick={loadJsonArray} disabled={busy}>
            Load JSON sample
          </button>
        </div>

        <hr style={styles.hr} />

        <p style={styles.p}>
          <strong>Options</strong>
        </p>
        <label style={{ marginRight: 16 }}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />{" "}
          Dry run (validate only)
        </label>
        <label>
          <input
            type="checkbox"
            checked={continueOnError}
            onChange={(e) => setContinueOnError(e.target.checked)}
          />{" "}
          Continue if any item fails
        </label>

        <hr style={styles.hr} />

        <p style={styles.p}>
          <strong>Auth</strong>
          <span style={{ marginLeft: 8, ...styles.muted }}>
            Token from <code>localStorage.token</code>
          </span>
        </p>
        <input
          placeholder="Paste admin JWT here (will be saved to localStorage)"
          style={{ ...styles.input, marginBottom: 6 }}
          value={tokenField}
          onChange={(e) => setTokenField(e.target.value)}
          onBlur={persistToken}
        />
        {!token && (
          <div style={{ ...styles.muted, marginBottom: 8 }}>
            Error: You are not logged in. Please login to admin to get a token.
          </div>
        )}

        <p style={styles.p}>
          <strong>Payload</strong>
          <span style={{ marginLeft: 8, ...styles.muted }}>
            Content-Type: {format === "ndjson" ? "application/x-ndjson" : "application/json"}
          </span>
        </p>
        <textarea
          rows={12}
          spellCheck={false}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 13,
          }}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder={
            format === "ndjson"
              ? "{...}\n{...}    (one JSON object per line)"
              : "[ {...}, {...} ]   (a JSON array)"
          }
        />

        <div style={{ marginTop: 10 }}>
          <button
            style={{ ...styles.button, padding: "10px 18px" }}
            onClick={handleRun}
            disabled={busy}
          >
            {busy ? "Running…" : "Run"}
          </button>
        </div>

        {!!errorMsg && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #fee2e2",
              background: "#fef2f2",
              color: "#991b1b",
            }}
          >
            {errorMsg}
          </div>
        )}

        {!!result && (
          <motion.pre
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 12,
              padding: 12,
              background: "#0b1020",
              color: "#d6e2ff",
              borderRadius: 10,
              overflow: "auto",
              maxHeight: 420,
              border: "1px solid #0f2147",
            }}
          >
            {JSON.stringify(result, null, 2)}
          </motion.pre>
        )}

        <hr style={styles.hr} />

        <div style={{ ...styles.muted, fontSize: 14 }}>
          <p style={{ margin: 0 }}>
            <strong>Tips</strong>
          </p>
          <ul>
            <li>
              Required fields per article: <code>title</code>,{" "}
              <code>summary</code>, <code>author</code>, <code>body</code>.
            </li>
            <li>
              Optional: <code>category</code> (name or slug),{" "}
              <code>tags</code> (names or slugs array), <code>status</code>,{" "}
              <code>publishAt</code>, <code>imageUrl</code>, <code>ogImage</code>,{" "}
              <code>metaTitle</code>, <code>metaDesc</code>, <code>geoMode</code>,{" "}
              <code>geoAreas</code>.
            </li>
            <li>
              Use <em>Dry run</em> first to validate slugs and counts before importing.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
