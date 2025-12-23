// frontend/src/pages/public/TopNews.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { cachedGet } from "../../lib/publicApi.js";
import { upsertTag, removeManagedHeadTags } from "../../lib/seoHead.js";
import { ensureRenderableImage } from "../../lib/images.js";

// ✅ AdSense helper (already used elsewhere in your project)
import { pushAd } from "../../lib/adsense.js";

import SiteNav from "../../components/SiteNav.jsx";
import SiteFooter from "../../components/SiteFooter.jsx";
import "./TopNews.css";

const FALLBACK_HERO_IMAGE = "/tv-default-hero.jpg";

/* ---------- AdSense (TopNews in-feed) ---------- */
const ADS_CLIENT = "ca-pub-8472487092329023";
const ADS_SLOT_INFEED_DESKTOP = "8428632191"; // TopNews InFeed Desktop
const ADS_SLOT_INFEED_MOBILE = "6748719010"; // TopNews InFeed Mobile

/* ---------- Advertisement Box (Right rail) ---------- */
const AD_MAIL_TO = "knotshorts1@gmail.com";
const ADVERT_IMG = "/ads/advertise-square.png"; // ✅ save image here: frontend/public/ads/advertise-square.png

/* Load AdSense script once (safe in SPA) */
function ensureAdsenseScript(client) {
  if (typeof document === "undefined") return;

  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  const exists = Array.from(document.scripts).some((s) => s.src === src);
  if (exists) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.crossOrigin = "anonymous";
  document.head.appendChild(s);
}

/* ✅ In-feed AdSense block (between cards) */
function useIsMobile(breakpointPx = 720) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia?.(`(max-width: ${breakpointPx}px)`)?.matches ?? false
    );
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const onChange = () => setIsMobile(mq.matches);

    setIsMobile(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [breakpointPx]);

  return isMobile;
}

function InFeedAd() {
  const isMobile = useIsMobile(720);
  const slot = isMobile ? ADS_SLOT_INFEED_MOBILE : ADS_SLOT_INFEED_DESKTOP;

  useEffect(() => {
    ensureAdsenseScript(ADS_CLIENT);

    // SPA timing: push now + delayed push
    pushAd();
    const t = setTimeout(() => pushAd(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, isMobile]);

  return (
    <li className="tn-ad">
      <div className="tn-ad-inner" aria-label="Advertiseme">
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADS_CLIENT}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </li>
  );
}

const CAT_COLORS = {
  World: "linear-gradient(135deg, #3B82F6 0%, #0073ff 100%)",
  Politics: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  Business: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  Entertainment: "linear-gradient(135deg, #A855F7 0%, rgb(119, 0, 255))",
  Sports: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
  Health: "linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)",
  Technology: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
  Science: "linear-gradient(135deg, #14B8A6 0%, #2DD4BF 100%)",
  India: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)",
  Opinion: "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)",
};

function getCategoryName(a) {
  if (a?.category && typeof a.category === "string" && a.category.trim()) {
    const s = String(a.category).trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (a?.categoryName) return String(a.categoryName);
  if (a?.category?.name) return String(a.category.name);
  if (a?.categorySlug) {
    const s = String(a.categorySlug).trim();
    if (!s) return "World";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return "World";
}

/* ---------- Cloudinary optimizer ---------- */
function optimizeCloudinary(url, width = 520) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

/* ---------- Video helpers ---------- */
function getVideoPreview(url = "") {
  const raw = String(url || "").trim();
  if (!raw) return { kind: "none", src: "" };
  if (raw.endsWith(".mp4")) return { kind: "direct", src: raw };
  return { kind: "none", src: "" };
}

/* ---------- utils ---------- */
function articleHref(slug) {
  if (!slug) return "#";
  if (slug.startsWith("/article/")) return slug;
  return `/article/${slug}`;
}

function parseTs(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  const t = Date.parse(String(v).replace(" ", "T"));
  return Number.isFinite(t) ? t : 0;
}

function normalizeTopNews(items = []) {
  return items
    .map((i, idx) => {
      const ts = Math.max(
        parseTs(i.publishedAt),
        parseTs(i.publishAt),
        parseTs(i.updatedAt),
        parseTs(i.createdAt)
      );
      return { ...i, _ts: ts, _idx: idx };
    })
    .sort((a, b) => (b._ts === a._ts ? a._idx - b._idx : b._ts - a._ts));
}

/* ================================
   OPINION: fetch helpers (robust)
   ================================ */
function isOpinionArticle(a) {
  const slug = String(a?.categorySlug || "").toLowerCase().trim();
  const name = String(
    a?.categoryName || a?.category?.name || a?.category || ""
  )
    .toLowerCase()
    .trim();
  return slug === "opinion" || name === "opinion";
}

// Try multiple endpoints so it works no matter which route your backend exposes.
async function fetchOpinionArticles() {
  const candidates = [
    () =>
      cachedGet(
        "/public/categories/opinion/articles",
        { params: { page: 1, limit: 30 } },
        30_000
      ),
    () =>
      cachedGet(
        "/public/categories/opinion/articles",
        { params: { limit: 30 } },
        30_000
      ),
    () =>
      cachedGet(
        "/public/categories/opinion",
        { params: { page: 1, limit: 30 } },
        30_000
      ),
    async () => {
      const data = await cachedGet(
        "/top-news",
        { params: { page: 1, limit: 80, mode: "public" } },
        30_000
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      return { items: items.filter(isOpinionArticle) };
    },
  ];

  let lastErr = null;
  for (const run of candidates) {
    try {
      const res = await run();
      const items =
        Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.data)
          ? res.data
          : [];

      const onlyOpinion = items.filter(isOpinionArticle);
      if (onlyOpinion.length) return onlyOpinion;
      if (items.length === 0) return [];
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Opinion fetch failed");
}

function pickOpinionImage(a) {
  const raw = ensureRenderableImage(a);
  return optimizeCloudinary(raw || FALLBACK_HERO_IMAGE, 360);
}

/* ================================
   FITNESS FUNDAS (HEALTH): helpers
   ================================ */
function isHealthArticle(a) {
  const slug = String(a?.categorySlug || "").toLowerCase().trim();
  const name = String(
    a?.categoryName || a?.category?.name || a?.category || ""
  )
    .toLowerCase()
    .trim();
  return slug === "health" || name === "health";
}

async function fetchHealthArticles() {
  const candidates = [
    () =>
      cachedGet(
        "/public/categories/health/articles",
        { params: { page: 1, limit: 40 } },
        30_000
      ),
    () =>
      cachedGet(
        "/public/categories/health/articles",
        { params: { limit: 40 } },
        30_000
      ),
    () =>
      cachedGet(
        "/public/categories/health",
        { params: { page: 1, limit: 40 } },
        30_000
      ),
    async () => {
      const data = await cachedGet(
        "/top-news",
        { params: { page: 1, limit: 120, mode: "public" } },
        30_000
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      return { items: items.filter(isHealthArticle) };
    },
  ];

  let lastErr = null;
  for (const run of candidates) {
    try {
      const res = await run();
      const items =
        Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.data)
          ? res.data
          : [];

      const onlyHealth = items.filter(isHealthArticle);
      if (onlyHealth.length) return onlyHealth;
      if (items.length === 0) return [];
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Health fetch failed");
}

function pickFitnessImage(a) {
  const raw = ensureRenderableImage(a);
  return optimizeCloudinary(raw || FALLBACK_HERO_IMAGE, 360);
}

/* ================================
   BOLLY BOX (ENTERTAINMENT): helpers
   ================================ */
function isEntertainmentArticle(a) {
  const slug = String(a?.categorySlug || "").toLowerCase().trim();
  const name = String(
    a?.categoryName || a?.category?.name || a?.category || ""
  )
    .toLowerCase()
    .trim();
  return slug === "entertainment" || name === "entertainment";
}

async function fetchEntertainmentArticles() {
  const candidates = [
    () =>
      cachedGet(
        "/public/categories/entertainment/articles",
        { params: { page: 1, limit: 30 } },
        30_000
      ),
    () =>
      cachedGet(
        "/public/categories/entertainment/articles",
        { params: { limit: 30 } },
        30_000
      ),
    () =>
      cachedGet(
        "/public/categories/entertainment",
        { params: { page: 1, limit: 30 } },
        30_000
      ),
    async () => {
      const data = await cachedGet(
        "/top-news",
        { params: { page: 1, limit: 100, mode: "public" } },
        30_000
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      return { items: items.filter(isEntertainmentArticle) };
    },
  ];

  let lastErr = null;
  for (const run of candidates) {
    try {
      const res = await run();
      const items =
        Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.data)
          ? res.data
          : [];

      const onlyEnt = items.filter(isEntertainmentArticle);
      if (onlyEnt.length) return onlyEnt;
      if (items.length === 0) return [];
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Entertainment fetch failed");
}

function pickBollyImage(a) {
  const raw = ensureRenderableImage(a);
  return optimizeCloudinary(raw || FALLBACK_HERO_IMAGE, 360);
}

/* ---------- Right-rail Advertisement Box component ---------- */
function AdvertisementBox() {
  // Opens Gmail compose with "To" filled.
  // Using gmail web compose link is the most reliable across browsers.
  const href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    AD_MAIL_TO
  )}`;

  return (
    <div className="adbox-card" aria-label="Advertisement Box">
      <div className="adbox-head">
        <div className="adbox-title">ADVERTISEMENT</div>
        <div className="adbox-underline" />
      </div>

      <a
        className="adbox-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Advertise with us. Email ${AD_MAIL_TO}`}
      >
        <div className="adbox-square">
          <img
            src={ADVERT_IMG}
            alt="Advertise with The Timely Voice"
            loading="lazy"
            decoding="async"
          />
        </div>
      </a>
    </div>
  );
}

export default function TopNews() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Opinion rail state
  const [opinion, setOpinion] = useState([]);
  const [opIndex, setOpIndex] = useState(0);
  const [opAnim, setOpAnim] = useState("in"); // "in" | "out"

  // Fitness Fundas (Health) rail state
  const [fitness, setFitness] = useState([]);
  const [ffIndex, setFfIndex] = useState(0);
  const [ffAnim, setFfAnim] = useState("in"); // "in" | "out"

  // Bolly Box rail state (Entertainment)
  const [bolly, setBolly] = useState([]);
  const [bbIndex, setBbIndex] = useState(0);
  const [bbAnim, setBbAnim] = useState("in"); // "in" | "out"

  /* ---------- SEO ---------- */
  useEffect(() => {
    removeManagedHeadTags();
    document.title = "Top News — The Timely Voice";
    const canonical = `${window.location.origin}/top-news`;

    upsertTag("link", { rel: "canonical", href: canonical });
    upsertTag("meta", {
      name: "description",
      content: "All the latest headlines across categories, newest first.",
    });
  }, []);

  /* ---------- Fetch (cached) ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        setErr("");

        const data = await cachedGet(
          "/top-news",
          { params: { page: 1, limit: 50, mode: "public" } },
          30_000
        );

        if (!cancel) setItems(normalizeTopNews(data?.items || []));
      } catch (e) {
        if (!cancel) setErr("Failed to load top news");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  /* ---------- Fetch OPINION (cached) ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const list = await fetchOpinionArticles();
        if (cancel) return;

        const shuffled = [...list].sort(() => Math.random() - 0.5);
        setOpinion(shuffled);
        setOpIndex(0);
      } catch {
        if (!cancel) setOpinion([]);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  /* ---------- OPINION swipe every ~2.6s ---------- */
  useEffect(() => {
    if (!opinion || opinion.length < 2) return;

    const TICK = 2600;
    const OUT_MS = 260;

    const t = setInterval(() => {
      setOpAnim("out");
      setTimeout(() => {
        setOpIndex((i) => (i + 1) % opinion.length);
        setOpAnim("in");
      }, OUT_MS);
    }, TICK);

    return () => clearInterval(t);
  }, [opinion]);

  /* ---------- Fetch FITNESS FUNDAS (HEALTH) (cached) ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const list = await fetchHealthArticles();
        if (cancel) return;

        const shuffled = [...list].sort(() => Math.random() - 0.5);
        setFitness(shuffled);
        setFfIndex(0);
      } catch {
        if (!cancel) setFitness([]);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  /* ---------- FITNESS FUNDAS swipe every 7s (one at a time) ---------- */
  useEffect(() => {
    if (!fitness || fitness.length < 2) return;

    const TICK = 7000;
    const OUT_MS = 260;

    const t = setInterval(() => {
      setFfAnim("out");
      setTimeout(() => {
        setFfIndex((i) => (i + 1) % fitness.length);
        setFfAnim("in");
      }, OUT_MS);
    }, TICK);

    return () => clearInterval(t);
  }, [fitness]);

  /* ---------- Fetch BOLLY BOX (cached) ---------- */
  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        const list = await fetchEntertainmentArticles();
        if (cancel) return;

        const shuffled = [...list].sort(() => Math.random() - 0.5);
        setBolly(shuffled);
        setBbIndex(0);
      } catch {
        if (!cancel) setBolly([]);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  /* ---------- BOLLY BOX swipe every 5s ---------- */
  useEffect(() => {
    if (!bolly || bolly.length < 2) return;

    const TICK = 5000;
    const OUT_MS = 260;

    const t = setInterval(() => {
      setBbAnim("out");
      setTimeout(() => {
        setBbIndex((i) => (i + 1) % bolly.length);
        setBbAnim("in");
      }, OUT_MS);
    }, TICK);

    return () => clearInterval(t);
  }, [bolly]);

  // ✅ Insert one in-feed ad after every N cards
  const AD_EVERY = 5;

  const listWithAds = useMemo(() => {
    const out = [];
    for (let i = 0; i < items.length; i++) {
      out.push({ kind: "article", item: items[i], idx: i });

      const isAfterN = (i + 1) % AD_EVERY === 0;
      const notLast = i !== items.length - 1;

      if (isAfterN && notLast) out.push({ kind: "ad", idx: i });
    }
    return out;
  }, [items]);

  // ✅ Opinion: show 3 at a time
  const opA = opinion.length ? opinion[opIndex % opinion.length] : null;
  const opB = opinion.length > 1 ? opinion[(opIndex + 1) % opinion.length] : null;
  const opC = opinion.length > 2 ? opinion[(opIndex + 2) % opinion.length] : null;

  // ✅ Fitness Fundas: show 1 at a time
  const ffA = fitness.length ? fitness[ffIndex % fitness.length] : null;

  // ✅ Bolly Box: show 2 at a time
  const bbA = bolly.length ? bolly[bbIndex % bolly.length] : null;
  const bbB = bolly.length > 1 ? bolly[(bbIndex + 1) % bolly.length] : null;

  return (
    <>
      <SiteNav />

      <div className="tn-shell">
        <div className="tn-stage">
          {/* LEFT: OPINION rail + Fitness Fundas below */}
          <aside className="tn-opinion" aria-label="Opinion and Fitness Fundas">
            <div className="tn-left-stack">
              {/* OPINION */}
              <div className="op-card" aria-label="Opinion">
                <div className="op-head">
                  <div className="op-title">OPINION</div>
                  <div className="op-underline" />
                </div>

                {opinion.length === 0 ? (
                  <div className="op-empty">No opinion articles yet</div>
                ) : (
                  <div className={`op-rows op-${opAnim}`}>
                    {opA && (
                      <OpinionRow
                        key={`${opA._id || opA.id || opA.slug || "opA"}-0`}
                        a={opA}
                      />
                    )}
                    {opB && (
                      <OpinionRow
                        key={`${opB._id || opB.id || opB.slug || "opB"}-1`}
                        a={opB}
                      />
                    )}
                    {opC && (
                      <OpinionRow
                        key={`${opC._id || opC.id || opC.slug || "opC"}-2`}
                        a={opC}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* FITNESS FUNDAS (Health) */}
              <div className="ff-card" aria-label="Fitness Fundas">
                <div className="ff-head">
                  <div className="ff-title">Fitness Fundas</div>
                  <div className="ff-underline" />
                </div>

                {fitness.length === 0 ? (
                  <div className="ff-empty">No health articles yet</div>
                ) : (
                  <div className={`ff-rows ff-${ffAnim}`}>
                    {ffA && (
                      <FitnessRow
                        key={`${ffA._id || ffA.id || ffA.slug || "ffA"}-0`}
                        a={ffA}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* CENTER: main list */}
          <main className="tn-container">
            {loading && <div className="tn-status">Loading…</div>}
            {err && <div className="tn-error">{err}</div>}

            {!loading && !err && (
              <ul className="tn-list">
                {listWithAds.map((row) => {
                  if (row.kind === "ad") {
                    return <InFeedAd key={`ad-${row.idx}`} />;
                  }

                  const a = row.item;
                  const href = articleHref(a.slug);
                  const catName = getCategoryName(a);
                  const color = CAT_COLORS[catName] || "#4B5563";

                  const rawImage = ensureRenderableImage(a);
                  const thumbSrc = optimizeCloudinary(
                    rawImage || FALLBACK_HERO_IMAGE,
                    520
                  );

                  const hasVideo = !!a.videoUrl;
                  const video = hasVideo ? getVideoPreview(a.videoUrl) : null;

                  return (
                    <li className="tn-item" key={a._id || a.id || a.slug}>
                      <div className="tn-left">
                        <Link to={href} className="tn-item-title">
                          {a.title}
                        </Link>

                        {(a.summary || a.description) && (
                          <Link to={href} className="tn-summary">
                            {a.summary || a.description}
                          </Link>
                        )}

                        <div className="tn-divider" />

                        <div className="tn-meta">
                          <span className="tn-source">The Timely Voice</span>
                        </div>
                      </div>

                      <Link to={href} className="tn-thumb">
                        <span className="tn-badge">
                          <span className="tn-pill" style={{ background: color }}>
                            {catName}
                          </span>
                        </span>

                        {hasVideo && video.kind === "direct" ? (
                          <video
                            src={video.src}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            poster={thumbSrc}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <img
                            src={thumbSrc}
                            alt={a.imageAlt || a.title || "The Timely Voice"}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_HERO_IMAGE;
                            }}
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </main>

          {/* RIGHT: BOLLY BOX rail + Advertisement box below */}
          <aside className="tn-bolly" aria-label="Bolly Box and Advertisement">
            <div className="tn-right-stack">
              {/* BOLLY BOX */}
              <div className="bb-card">
                <div className="bb-head">
                  <div className="bb-title">BOLLY BOX</div>
                  <div className="bb-underline" />
                </div>

                {bolly.length === 0 ? (
                  <div className="bb-empty">No entertainment articles yet</div>
                ) : (
                  <div className={`bb-rows bb-${bbAnim}`}>
                    {bbA && (
                      <BollyRow
                        key={`${bbA._id || bbA.id || bbA.slug || "bbA"}-0`}
                        a={bbA}
                      />
                    )}
                    {bbB && (
                      <BollyRow
                        key={`${bbB._id || bbB.id || bbB.slug || "bbB"}-1`}
                        a={bbB}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* ADVERTISEMENT BOX (square image) */}
              <AdvertisementBox />
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </>
  );
}

function OpinionRow({ a }) {
  const href = articleHref(a.slug);
  const img = pickOpinionImage(a);

  return (
    <Link to={href} className="op-row">
      <div className="op-img">
        <img
          src={img}
          alt={a.imageAlt || a.title || "Opinion"}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_HERO_IMAGE;
          }}
        />
      </div>

      <div className="op-text">
        <div className="op-source">The Timely Voice</div>
        <div className="op-news-title">{a.title}</div>
      </div>
    </Link>
  );
}

function FitnessRow({ a }) {
  const href = articleHref(a.slug);
  const img = pickFitnessImage(a);

  return (
    <Link to={href} className="ff-row">
      <div className="ff-img">
        <img
          src={img}
          alt={a.imageAlt || a.title || "Fitness Fundas"}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_HERO_IMAGE;
          }}
        />
      </div>

      <div className="ff-text">
        <div className="ff-source">The Timely Voice</div>
        <div className="ff-news-title">{a.title}</div>
      </div>
    </Link>
  );
}

function BollyRow({ a }) {
  const href = articleHref(a.slug);
  const img = pickBollyImage(a);

  return (
    <Link to={href} className="bb-row">
      <div className="bb-img">
        <img
          src={img}
          alt={a.imageAlt || a.title || "Bolly Box"}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_HERO_IMAGE;
          }}
        />
      </div>

      <div className="bb-text">
        <div className="bb-source">The Timely Voice</div>
        <div className="bb-news-title">{a.title}</div>
      </div>
    </Link>
  );
}
