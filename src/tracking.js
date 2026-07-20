/**
 * Attribution wiring — Meta Pixel loader + UTM preservation on store links.
 *
 * Design principle: every function is a no-op when UKTI_CONFIG.metaPixelId is
 * empty. Until the Pixel ID is provisioned and pasted into public/config.js,
 * this file imports and initializes and does absolutely nothing visible —
 * which means we can ship it now, Marketing's attribution layer stays "wired
 * and waiting" without burning scripts or cookies on visitors pre-launch.
 *
 * Once metaPixelId is set:
 *   - Meta Pixel base snippet loads on first page load
 *   - PageView fires automatically
 *   - ViewContent fires when Beat 6 ("Your turn.") enters the viewport
 *   - Lead fires when any outbound store link is clicked — the Beat 6 badges and,
 *     on a phone, the hero CTAs that install.js has pointed at the store
 *   - UTM + fbclid query params are preserved onto those same hrefs at load time
 *     (so attribution survives the App Store / Play Store bounce)
 *
 * See docs/launch/pre-production-blockers.md §1 for the Pixel provisioning
 * procedure.
 */

const cfg = window.UKTI_CONFIG || {};
const pixelId = cfg.metaPixelId || "";

/**
 * Every outbound store link on the page: the static Beat 6 badges, plus any
 * hero CTA that install.js has already rewritten into a direct store link for
 * this device. Both carry attribution; both count as a Lead.
 */
const STORE_LINKS = ".store-pill, [data-store-link]";

function initMetaPixel() {
  if (!pixelId) return;

  // Meta's canonical base snippet, inlined. Uses their CDN at connect.facebook.net
  // under Meta's control — any CSP must allow fonts.gstatic.com isn't relevant,
  // but *.facebook.net + *.facebook.com must be in script-src + connect-src + img-src.
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
  /* eslint-enable */

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

/**
 * Fires `Lead` event on store-pill click. Wires to both .store-pill anchors
 * on every page (homepage + how-it-works).
 */
function attachStorePillTracking() {
  if (!pixelId) return;
  document.querySelectorAll(STORE_LINKS).forEach((el) => {
    el.addEventListener("click", () => {
      const label = el.getAttribute("aria-label") || "store-pill";
      window.fbq && window.fbq("track", "Lead", { content_name: label });
    });
  });
}

/**
 * Fires `ViewContent` when Beat 6 ("Your turn.") enters viewport.
 * Signal to Meta that this user reached the CTA surface — distinct from
 * bounce-on-hero traffic. Used for quality-scoring ad sets.
 */
function attachYourTurnInView() {
  if (!pixelId) return;
  const target = document.getElementById("your-turn");
  if (!target) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          window.fbq && window.fbq("track", "ViewContent", { content_name: "your-turn" });
          io.disconnect(); // one-shot per page load
        }
      });
    },
    { threshold: 0.4 },
  );
  io.observe(target);
}

/**
 * Preserves Meta ad attribution across the bounce to App Store / Play Store.
 * Reads utm_* + fbclid from the current URL's query string and appends them
 * to every .store-pill href at page load. Apple passes `pt`/`ct` through;
 * Google passes `referrer`. This means if a user clicked a Meta ad with
 * `utm_campaign=spring-launch&fbclid=xyz`, that attribution reaches the
 * app post-install via the store's referrer attribution.
 *
 * Runs even when metaPixelId is empty — UTM preservation is useful regardless
 * of whether we're also firing Pixel events. It's a plain-URL-manipulation
 * affordance that costs nothing.
 */
function preserveUtmOnStoreLinks() {
  const here = new URLSearchParams(window.location.search);
  const relevant = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"];
  const forward = new URLSearchParams();
  for (const k of relevant) {
    const v = here.get(k);
    if (v) forward.set(k, v);
  }
  if ([...forward].length === 0) return;

  document.querySelectorAll(STORE_LINKS).forEach((el) => {
    try {
      const url = new URL(el.href);
      for (const [k, v] of forward) url.searchParams.set(k, v);
      el.href = url.toString();
    } catch {
      // invalid href; skip silently
    }
  });
}

// Boot on DOMContentLoaded — all three handlers are idempotent and no-ops
// when the Pixel ID is absent (UTM preservation always runs).
function boot() {
  initMetaPixel();
  attachStorePillTracking();
  attachYourTurnInView();
  preserveUtmOnStoreLinks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
