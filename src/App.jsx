// frontend/src/App.jsx
import { useEffect, useState, lazy, Suspense } from "react";
import { Routes, Route, useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/* ===================== Global CSS ===================== */
import "./styles/home.css";
import "./styles/aspectRatio.css";
import "./styles/typography.css";
import "./styles/scroll-optimizations.css";

/* ===================== SEO helpers (re-exported) ===================== */
import {
  upsertTag,
  buildCanonicalFromLocation,
  addJsonLd,
  removeManagedHeadTags,
} from "./lib/seoHead.js";

export {
  upsertTag,
  buildCanonicalFromLocation,
  addJsonLd,
  removeManagedHeadTags,
};

/* ===================== Shared API ===================== */
export const api = axios.create({
  baseURL: import.meta?.env?.VITE_API_BASE_URL || "",
  withCredentials: false,
});

export function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

export function setToken(t) {
  try {
    localStorage.setItem("token", String(t || ""));
  } catch {}
}

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

/* ===================== Shared constants ===================== */
export const CATEGORIES = [
  "All",
  "General",
  "World",
  "Politics",
  "Business",
  "Entertainment",
  "Health",
  "Science",
  "Sports",
  "Tech",
  "History",
  "Finance",
];

export const styles = {
  page: { padding: 16, maxWidth: 1120, margin: "0 auto" },
  nav: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 },
  card: {
    background: "#0c1b3a",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: 16,
    color: "#E6EDF3",
  },
  button: {
    background: "#10284e",
    color: "#E6EDF3",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "#0c1b3a",
    color: "#E6EDF3",
    outline: "none",
  },
  hr: { border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "14px 0" },
  p: { margin: "8px 0", color: "#E6EDF3" },
  muted: { color: "rgba(255,255,255,0.65)" },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    fontSize: 12,
    fontWeight: 800,
    marginLeft: 8,
  },
};

/* ===================== Public pages (lazy) ===================== */
const NotFound = lazy(() => import("./pages/public/NotFound.jsx"));
const SearchPage = lazy(() => import("./pages/public/SearchPage.jsx"));
const PublicHome = lazy(() => import("./pages/public/PublicHome.jsx"));
const CategoryPage = lazy(() => import("./pages/public/CategoryPage.jsx"));
const TagPage = lazy(() => import("./pages/public/TagPage.jsx"));
const ReaderArticle = lazy(() => import("./pages/public/Article.jsx"));
const TopNews = lazy(() => import("./pages/public/TopNews.jsx"));
const FinanceCategoryPage = lazy(() => import("./pages/public/FinanceCategoryPage.jsx"));
const HealthPage = lazy(() => import("./pages/public/HealthPage.jsx"));
const HistoryPage = lazy(() => import("./pages/history/HistoryPage.jsx"));

/* ===================== Admin pages (ALL lazy) ===================== */
const AdminShell = lazy(() => import("./layouts/AdminShell.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard.jsx"));
const AdminMedia = lazy(() => import("./pages/admin/MediaLibrary.jsx"));
const ArticlesPage = lazy(() => import("./pages/admin/ArticlesPage.jsx"));
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage.jsx"));
const TagsPage = lazy(() => import("./pages/admin/TagsPage.jsx"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage.jsx"));
const CommentsPage = lazy(() => import("./pages/admin/CommentsPage.jsx"));
const BreakingNewsAdmin = lazy(() => import("./pages/admin/BreakingNewsAdmin.jsx"));
const TickerAdmin = lazy(() => import("./pages/admin/TickerAdmin.jsx"));
const SectionsPage = lazy(() => import("./admin/sections/SectionsPage.jsx"));
const SectionsV2Page = lazy(() => import("./admin/sectionsV2/SectionsV2Page.jsx"));
const AutomationDashboard = lazy(() => import("./pages/admin/AutomationDashboard.jsx"));

const AutmotionFeedsPage = lazy(() => import("./pages/admin/autmotion/FeedsPage.jsx"));
const AutmotionQueuePage = lazy(() => import("./pages/admin/autmotion/QueuePage.jsx"));
const AutmotionDraftsPage = lazy(() => import("./pages/admin/autmotion/DraftsPage.jsx"));
const AutmotionXSourcesPage = lazy(() => import("./pages/admin/autmotion/XSourcesPage.jsx"));
const AutmotionXQueuePage = lazy(() => import("./pages/admin/autmotion/XQueuePage.jsx"));

const ArticlesBulkImport = lazy(() => import("./admin/ArticlesBulkImport.jsx"));
const AdminDrafts = lazy(() => import("./admin/articles/AdminDrafts.jsx"));
const AdsPage = lazy(() => import("./admin/AdsPage.jsx"));
const AdminXPage = lazy(() => import("./pages/AdminX.jsx"));

/* ===================== Static pages ===================== */
const AboutPage = lazy(() => import("./pages/static/About.jsx"));
const ContactPage = lazy(() => import("./pages/static/Contact.jsx"));
const EditorialPolicyPage = lazy(() => import("./pages/static/EditorialPolicy.jsx"));
const CorrectionsPage = lazy(() => import("./pages/static/Corrections.jsx"));
const PrivacyPolicyPage = lazy(() => import("./pages/static/PrivacyPolicy.jsx"));
const TermsPage = lazy(() => import("./pages/static/Terms.jsx"));
const AdvertisingPage = lazy(() => import("./pages/static/Advertising.jsx"));
const AuthorPage = lazy(() => import("./pages/static/Author.jsx"));
const EditorialDisclaimerPage = lazy(() => import("./pages/static/EditorialDisclaimer.jsx"));

/* ===================== Analytics ===================== */
import { notifyRouteChange, track } from "./lib/analytics";

/* ===================== Error Boundary ===================== */
import ErrorBoundary from "./components/ErrorBoundary.jsx";

/* ===================== Category Route Wrapper ===================== */
function AnyCategoryRoute() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const loc = useLocation();
  const normalized = String(slug || "").toLowerCase();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const want = `/category/${normalized}`;
    if (loc.pathname !== want) {
      navigate(want, { replace: true });
      return;
    }
    setReady(true);
  }, [normalized, loc.pathname, navigate]);

  if (!ready) return null;

  if (normalized === "history") return <HistoryPage />;

  if (normalized === "finance" || normalized === "business") {
    return (
      <FinanceCategoryPage
        categorySlug={normalized}
        displayName={normalized === "business" ? "Business" : "Finance"}
      />
    );
  }

  return <CategoryPage />;
}

/* ===================== App ===================== */
export default function App() {
  const loc = useLocation();

  useEffect(() => {
    notifyRouteChange(loc.pathname, loc.search);
    track("page_view", { path: `${loc.pathname}${loc.search}` });
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    const origin = window.location.origin;
    addJsonLd("site", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "My News",
      url: origin,
      potentialAction: {
        "@type": "SearchAction",
        target: `${origin}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });
  }, []);

  useEffect(() => {
    upsertTag("link", {
      rel: "canonical",
      href: buildCanonicalFromLocation(),
    });
  }, [loc.pathname, loc.search]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/top-news" element={<TopNews />} />
          <Route path="/health" element={<HealthPage />} />

          <Route path="/category/:slug" element={<AnyCategoryRoute />} />

          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/article/:slug" element={<ReaderArticle />} />
          <Route path="/news/:slug" element={<ReaderArticle />} />
          <Route path="/search" element={<SearchPage />} />

          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/editorial-policy" element={<EditorialPolicyPage />} />
          <Route path="/corrections" element={<CorrectionsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/editorial-disclaimer" element={<EditorialDisclaimerPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/terms-and-conditions" element={<TermsPage />} />
          <Route path="/advertising" element={<AdvertisingPage />} />
          <Route path="/author/:slug" element={<AuthorPage />} />

          <Route path="/admin" element={<AdminShell><AdminDashboard /></AdminShell>} />
          <Route path="/admin/articles" element={<AdminShell><ArticlesPage /></AdminShell>} />
          <Route path="/admin/articles/bulk" element={<AdminShell><ArticlesBulkImport /></AdminShell>} />
          <Route path="/admin/media" element={<AdminShell><AdminMedia /></AdminShell>} />
          <Route path="/admin/categories" element={<AdminShell><CategoriesPage /></AdminShell>} />
          <Route path="/admin/tags" element={<AdminShell><TagsPage /></AdminShell>} />
          <Route path="/admin/settings" element={<AdminShell><SettingsPage /></AdminShell>} />
          <Route path="/admin/comments" element={<AdminShell><CommentsPage /></AdminShell>} />
          <Route path="/admin/breaking" element={<AdminShell><BreakingNewsAdmin /></AdminShell>} />
          <Route path="/admin/ticker" element={<AdminShell><TickerAdmin /></AdminShell>} />
          <Route path="/admin/sections" element={<AdminShell><SectionsPage /></AdminShell>} />
          <Route path="/admin/sections-v2" element={<AdminShell><SectionsV2Page /></AdminShell>} />
          <Route path="/admin/automation" element={<AdminShell><AutomationDashboard /></AdminShell>} />

          <Route path="/admin/autmotion/feeds" element={<AdminShell><AutmotionFeedsPage /></AdminShell>} />
          <Route path="/admin/autmotion/queue" element={<AdminShell><AutmotionQueuePage /></AdminShell>} />
          <Route path="/admin/autmotion/drafts" element={<AdminShell><AutmotionDraftsPage /></AdminShell>} />
          <Route path="/admin/autmotion/x-sources" element={<AdminShell><AutmotionXSourcesPage /></AdminShell>} />
          <Route path="/admin/autmotion/x-queue" element={<AdminShell><AutmotionXQueuePage /></AdminShell>} />
          <Route path="/admin/automation/x-queue" element={<AdminShell><AutmotionXQueuePage /></AdminShell>} />

          <Route path="/admin/x" element={<AdminShell><AdminXPage /></AdminShell>} />
          <Route path="/admin/drafts" element={<AdminShell><AdminDrafts /></AdminShell>} />
          <Route path="/admin/ads" element={<AdminShell><AdsPage /></AdminShell>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
