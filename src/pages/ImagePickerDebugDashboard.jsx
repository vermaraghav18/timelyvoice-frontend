import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ImagePickerDebugDashboard.css";

export default function ImagePickerDebugDashboard() {
  const [slug, setSlug] = useState("");
  const [article, setArticle] = useState(null);
  const [debug, setDebug] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchArticle() {
    try {
      setError("");
      setLoading(true);
      const res = await axios.get(`/api/admin/articles/${slug}`);
      setArticle(res.data.article || null);
      setLoading(false);
    } catch (err) {
      setError("Failed to load article.");
      setLoading(false);
    }
  }

  async function runPicker() {
    if (!article) return;
    try {
      setLoading(true);
      setError("");

      // ✅ FIX: correct backend endpoint
      const res = await axios.post(`/api/debug/image-picker`, {
        meta: {
          title: article.title,
          summary: article.summary,
          slug: article.slug,
          category: article.category,
          tags: article.tags,
        },
      });

      setDebug(res.data);
      setLoading(false);
    } catch (err) {
      setError("Error running picker.");
      setLoading(false);
    }
  }

  return (
    <div className="picker-debug-container">
      <h1>🖼 Image Picker Debug Dashboard</h1>

      <div className="input-row">
        <input
          placeholder="Enter article slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <button onClick={fetchArticle}>Load Article</button>
      </div>

      {loading && <div className="loading">⌛ Loading...</div>}
      {error && <div className="error">{error}</div>}

      {article && (
        <div className="article-box">
          <h2>{article.title}</h2>
          <p>{article.summary}</p>
          <p>
            <b>Category:</b> {article.category}
          </p>

          <button onClick={runPicker} className="run-btn">
            ▶ Re-run Image Picker
          </button>
        </div>
      )}

      {debug && (
        <div className="debug-box">
          <h2>Picker Result</h2>

          <div className="chosen-section">
            <img src={debug.url} alt="chosen" className="chosen-img" />
            <div>
              <p>
                <b>Public ID:</b> {debug.publicId}
              </p>
              <p>
                <b>Why:</b>{" "}
                {debug.why ? JSON.stringify(debug.why, null, 2) : "No reason"}
              </p>
            </div>
          </div>

          <h3>📌 Debug Details</h3>
          <pre className="json-block">{JSON.stringify(debug, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
