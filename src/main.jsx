// frontend/src/main.jsx
import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import { ToastProvider } from "./providers/ToastProvider.jsx";
import { initAnalytics } from "./lib/analytics";

import "./theme/tokens.css";
import "./styles/aspectRatio.css";

const AdminShell = lazy(() => import("./layouts/AdminShell.jsx"));
const AdminAnalytics = lazy(() => import("./lib/AdminAnalytics.jsx"));

function defer(fn) {
  if (typeof window === "undefined") return;
  const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  ric(() => fn());
}

// ✅ Defer analytics so first paint is faster
defer(() => initAnalytics());

const Loader = () => <div style={{ height: 200 }} />;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/*" element={<App />} />
            <Route
              path="/admin/analytics"
              element={
                <AdminShell>
                  <AdminAnalytics />
                </AdminShell>
              }
            />
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
