// TODO: analytics SDK stub (init later)// frontend/src/lib/analytics.js

// --- IDs (visitor + session) ---
const VISITOR_KEY = 'news_vis_id';
const SESSION_KEY = 'news_ses_id';
const SESSION_TOUCH = 'news_ses_last'; // ms timestamp
const SESSION_TIMEOUT_MIN = 30; // new session after 30 min of inactivity

function uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11)
    .replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

function getSessionId() {
  const now = Date.now();
  const last = parseInt(localStorage.getItem(SESSION_TOUCH) || '0', 10);
  let ses = localStorage.getItem(SESSION_KEY);

  const inactiveMs = now - (isNaN(last) ? 0 : last);
  const timedOut = inactiveMs > SESSION_TIMEOUT_MIN * 60 * 1000;

  if (!ses || timedOut) {
    ses = uuid();
    localStorage.setItem(SESSION_KEY, ses);
  }
  localStorage.setItem(SESSION_TOUCH, String(now));
  return ses;
}

// --- Transport ---
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function sendEvents(events) {
  try {
    const payload = JSON.stringify({ events });

    // Use a CORS-safelisted content type to avoid preflight.
    // Server still parses JSON from the string body.
    const body = payload;
    const contentType = 'text/plain;charset=UTF-8';

    const url = `${API_BASE}/analytics/collect`;

    // Prefer sendBeacon so it doesn't block navigation and avoids preflight.
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: contentType });
      navigator.sendBeacon(url, blob);
      return;
    }

    // Fallback: fetch without credentials and with safelisted content-type
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
      // keepalive lets this complete during page unloads
      keepalive: true,
      // Explicitly avoid sending cookies/auth so the browser doesn't
      // treat this as a "credentialed" CORS request.
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store',
    }).catch(() => {});
  } catch (_e) {
    // ignore
  }
}

// --- Helpers to capture page info ---
function currentPath() {
  return window.location.pathname + window.location.search + window.location.hash;
}

function baseEvent(fields = {}) {
  return {
    ts: Date.now(),
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    path: currentPath(),
    title: document.title || '',
    ...fields,
  };
}

// --- Public API ---
export function track(type, data = {}) {
  sendEvents([ baseEvent({ type, ...data }) ]);
}

export function initAnalytics() {
  // Respect Do Not Track
  const dnt = (navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack);
  if (String(dnt) === '1') return;

  // First page_view on load
  track('page_view');

  // Minimal route change tracking:
  // intercept pushState/replaceState and listen for back/forward
  const { pushState, replaceState } = history;
  function onNav() { track('page_view'); }

  history.pushState = function(...args) {
    const ret = pushState.apply(this, args);
    onNav();
    return ret;
  };
  history.replaceState = function(...args) {
    const ret = replaceState.apply(this, args);
    onNav();
    return ret;
  };
  window.addEventListener('popstate', onNav);

  // Basic scroll depth (25/50/75/90 once per page)
  let sent = new Set();
  function onScroll() {
    const h = document.documentElement;
    const scrolled = (h.scrollTop || document.body.scrollTop);
    const height = (h.scrollHeight - h.clientHeight) || 1;
    const pct = Math.min(100, Math.round((scrolled / height) * 100));
    [25,50,75,90].forEach(mark => {
      if (pct >= mark && !sent.has(mark)) {
        sent.add(mark);
        track('scroll', { scroll: { pct: mark } });
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // Heartbeat every 15s while tab is visible
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      track('heartbeat', { read: { secondsVisible: 15 } });
    }
  }, 15000);

  // expose manual hook if needed
  window.newsTrack = track;
}
