/**
 * /get — the short URL the QR code encodes, and the one link that can be handed
 * out anywhere (printed card, WhatsApp, a talk slide) without knowing what the
 * recipient is holding. A scanning phone lands on its own store; desktop stays
 * put and gets the fallback UI in get.html.
 *
 * Depends only on config.js + platform.js so the redirect fires without waiting
 * on the Vite bundle. External file, not inline: the CSP sets script-src 'self'
 * with no unsafe-inline, so an inline block would be dropped and the page would
 * silently strand every phone on the desktop fallback.
 */
(function () {
  var url = typeof window.uktiStoreUrl === "function" ? window.uktiStoreUrl() : "";

  // replace() rather than assign() — /get is a waypoint, not a destination, and
  // should not sit in history eating the phone's back button.
  if (url) window.location.replace(url);

  // Desktop, unknown device, or unpopulated config: fall through to the page.
})();
