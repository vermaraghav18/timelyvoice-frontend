// frontend/src/lib/analytics.js
// No-code friendly: configure BACKEND_URL only.
// Excludes bots/admin on server; honors DNT + opt-out cookie.

const BACKEND_URL = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Globals
let started = false;
let heartbeatTimer = null;
let readSeconds = 0;
let sentReadComplete = false;
let lastPV = { path: '', ts: 0 }; // de-dupe page_view within a short window
let scrollListener = null;

// ---------- Opt-out helpers ----------
function getCookie(name) {
  try {
    const m = document.cookie.match(
      new RegExp(
        '(?:^|; )' + 
        name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + 
        '=([^;]*)'
      )
    );
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

function hasOptOutCookie() {
  return getCookie('analytics_optout') === '1';
}
function browserDNTEnabled() {
  try {
    return (navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack) === '1';
  } catch {
    return false;
  }
}
function shouldDropClientSide() {
  // Client-side guard; server also enforces DNT/opt-out
  return typeof window === 'undefined' || browserDNTEnabled() || hasOptOutCookie();
}

/**
 * Public toggle to enable/disable analytics persistently via cookie.
 * - When enabling opt-out, we also stop the heartbeat immediately.
 * - When disabling, analytics will start the next time initAnalytics() runs.
 */
export function setAnalyticsOptOut(enabled) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  if (enabled) {
    document.cookie = `analytics_optout=1; path=/; max-age=${maxAge}; SameSite=Lax`;
    stopHeartbeat();
  } else {
    document.cookie = `analytics_optout=; path=/; max-age=0; SameSite=Lax`;
  }
}

/** Useful for UI checkboxes */
export function isAnalyticsOptedOut() {
  return hasOptOutCookie();
}

// ---------- Safe storage ----------
function safeGet(item, key) {
  try { return item.getItem(key); } catch { return null; }
}
function safeSet(item, key, val) {
  try { item.setItem(key, val); } catch { /* ignore */ }
}

// ---------- Core posting ----------
function post(path, body) {
  try {
    if (shouldDropClientSide()) return Promise.resolve();
    return fetch(`${BACKEND_URL}/analytics${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'X-Geo-Preview-Country': 'IN',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    }).catch(() => {});
  } catch (_) {}
}

function nowISO() {
  return new Date().toISOString();
}

function getVisitorId() {
  const key = 'news_vid';
  let v = safeGet(localStorage, key);
  if (!v) {
    v = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2);
    safeSet(localStorage, key, v);
  }
  return v;
}

function getSessionId() {
  const key = 'news_sid';
  let s = safeGet(sessionStorage, key);
  if (!s) {
    s = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2);
    safeSet(sessionStorage, key, s);
  }
  return s;
}

function getUTM() {
  try {
    const p = new URLSearchParams(location.search);
    const utm = {};
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k => {
      const v = p.get(k);
      if (v) utm[k] = v;
    });
    return Object.keys(utm).length ? utm : null;
  } catch {
    return null;
  }
}

export function track(type, data = {}) {
  if (shouldDropClientSide()) return Promise.resolve();

  const payload = {
    type,
    ts: nowISO(),
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    path: location.pathname + location.search,
    referrer: document.referrer || null,
    utm: getUTM(),
    ...data,
  };
  return post('/collect', payload);
}

// ---------- Heartbeat / Scroll ----------
function startHeartbeat() {
  stopHeartbeat();
  if (shouldDropClientSide()) return; // don’t start if opted out

  heartbeatTimer = setInterval(() => {
    readSeconds += 15;
    track('heartbeat', { read: { seconds: readSeconds } });
    // Auto mark read_complete at 60s (tweak later)
    if (!sentReadComplete && readSeconds >= 60) {
      sentReadComplete = true;
      track('read_complete', { read: { seconds: readSeconds, reason: 'time' } });
    }
  }, 15000);
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

function setupScroll() {
  if (shouldDropClientSide()) return;

  const thresholds = [25, 50, 75, 90];
  const sent = new Set();

  const onScroll = () => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
    const height = Math.max(
      body.scrollHeight, body.offsetHeight,
      doc.clientHeight, doc.scrollHeight, doc.offsetHeight
    );
    const win = window.innerHeight || doc.clientHeight || 0;
    const pct = Math.min(100, Math.round(((scrollTop + win) / height) * 100));

    thresholds.forEach(t => {
      if (!sent.has(t) && pct >= t && !shouldDropClientSide()) {
        sent.add(t);
        track('scroll', { scroll: { p: t } });
      }
    });

    // Also mark read_complete based on depth (70%+)
    if (!sentReadComplete && pct >= 70) {
      sentReadComplete = true;
      track('read_complete', { read: { seconds: readSeconds, reason: 'depth' } });
    }
  };

  // keep a reference to unbind later if needed
  scrollListener = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // check once
}

function teardownScroll() {
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener, { passive: true });
  }
  scrollListener = null;
}

// ---------- SPA route change integration ----------

/**
 * Call this from React Router (App.jsx) on route changes.
 * De-dupes page_view events and (re)starts heartbeat for the new page.
 */
export function notifyRouteChange(path = location.pathname, search = location.search) {
  if (shouldDropClientSide()) {
    stopHeartbeat();
    return;
  }
  const now = Date.now();
  const full = `${path}${search || ''}`;
  // de-dupe page_view if same path within 400ms (router updates can trigger twice)
  if (lastPV.path === full && now - lastPV.ts < 400) return;

  lastPV = { path: full, ts: now };
  track('page_view', { path, q: search || '' });

  // reset read trackers
  sentReadComplete = false;
  readSeconds = 0;
  startHeartbeat();
}

// ---------- Init / Teardown ----------
export function initAnalytics() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Respect browser DNT & opt-out cookie early (server also enforces)
  if (shouldDropClientSide()) return;

  // Initial page view (current URL)
  notifyRouteChange();

  // Timers & listeners
  setupScroll();

  // As a safety net for non-Router navigations (rare in our app),
  // we also hook into history changes. If you use notifyRouteChange
  // in App.jsx (recommended), this will just be a backup.
  const pushState = history.pushState;
  history.pushState = function (...args) {
    const ret = pushState.apply(this, args);
    if (!shouldDropClientSide()) {
      notifyRouteChange();
    } else {
      stopHeartbeat();
    }
    return ret;
  };
  window.addEventListener('popstate', () => {
    if (!shouldDropClientSide()) {
      notifyRouteChange();
    } else {
      stopHeartbeat();
    }
  });
}

// Optional manual stop (rarely needed)
export function teardownAnalytics() {
  stopHeartbeat();
  teardownScroll();
}
