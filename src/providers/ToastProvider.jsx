// src/providers/ToastProvider.jsx
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);

  const push = useCallback((t) => {
    const id = idRef.current++;
    const toast = {
      id,
      title: t.title || "",
      message: t.message || "",
      type: t.type || "info", // "success" | "error" | "info" | "warning"
      timeout: t.timeout ?? 2600,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.timeout > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, toast.timeout);
    }
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const api = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onClose={remove} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ---------- View ---------- */
function ToastViewport({ toasts, onClose }) {
  return (
    <div style={viewportStyle}>
      {toasts.map((t) => (
        <div key={t.id} style={{ ...toastStyle, ...toneStyle(t.type) }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.title}</div>
          {t.message ? <div style={{ fontSize: 13 }}>{t.message}</div> : null}
          <button onClick={() => onClose(t.id)} style={closeBtnStyle} aria-label="Close">×</button>
    </div>
      ))}
    </div>
  );
}

/* ---------- Styles ---------- */
const viewportStyle = {
  position: "fixed",
  right: 16,
  bottom: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  zIndex: 9999,
};

const toastStyle = {
  position: "relative",
  minWidth: 260,
  maxWidth: 360,
  padding: "10px 36px 10px 12px",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  background: "#fff",
  border: "1px solid #e5e7eb",
};

const closeBtnStyle = {
  position: "absolute",
  right: 8,
  top: 6,
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer",
  lineHeight: 1,
};

function toneStyle(type) {
  if (type === "success") return { borderColor: "#16a34a33", background: "#f0fdf433" };
  if (type === "error") return { borderColor: "#dc262633", background: "#fef2f233" };
  if (type === "warning") return { borderColor: "#f59e0b33", background: "#fffbeb66" };
  return { borderColor: "#e5e7eb", background: "#ffffff" }; // info
}
