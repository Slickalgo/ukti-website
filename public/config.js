/**
 * Runtime config — populated at launch, placeholder before.
 *
 * Listed as `window.UKTI_CONFIG` so any inline script or module can read it
 * without importing. Every consumer MUST treat each field as possibly empty.
 *
 * See docs/launch/pre-production-blockers.md for the swap-in procedure.
 */
window.UKTI_CONFIG = {
  /**
   * Meta Pixel ID (15-digit numeric string from Meta Business Manager).
   * Leave empty until provisioned. Empty = no Pixel script loads, no events fire.
   * Once set, the loader in src/tracking.js fires PageView + ViewContent + Lead automatically.
   */
  metaPixelId: "",

  /**
   * Canonical short URL that the QR code encodes + desktop "→ INSTALL" text-link.
   * Also the destination every paid Meta ad points at, so it has to carry utm_* /
   * fbclid through to the store — see public/get.js.
   */
  shortUrl: "https://ukti.io/get",

  /**
   * Store URLs — source of truth for every device-aware install path:
   * the /get redirect (what the QR encodes) and the hero CTA routing in
   * src/install.js. The static <a class="store-pill"> badges in index.html +
   * how-it-works.html duplicate these strings as the no-JS fallback, so a URL
   * change means updating those two files as well.
   */
  appStoreUrl: "https://apps.apple.com/app/id6782030430",
  playStoreUrl: "https://play.google.com/store/apps/details?id=io.ukti.app",
};
