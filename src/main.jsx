// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initAnalytics } from './lib/analytics';
import App from './App.jsx';
import AdminAnalytics from './lib/AdminAnalytics.jsx';
import { ToastProvider } from './providers/ToastProvider.jsx';
import AdminShell from './layouts/AdminShell.jsx';
import './theme/tokens.css';
import './styles/aspectRatio.css';



// Start analytics (respects DNT + opt-out cookie)
initAnalytics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Your existing app (App owns its internal routes) */}
          <Route path="/*" element={<App />} />
          {/* Admin analytics, now inside the Admin shell */}
          <Route path="/admin/analytics" element={
            <AdminShell>
              <AdminAnalytics />
            </AdminShell>
          } />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
