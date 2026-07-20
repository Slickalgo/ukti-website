/**
 * Device detection — shared by every install surface.
 *
 * Consumers:
 *   - src/install.js   routes the two hero CTAs to the right store
 *   - src/style.css    swaps Beat 6 between tappable badges and the QR handoff
 *   - public/get.js    redirects /get, which is what the QR encodes
 *
 * Lives in public/ rather than src/ for two reasons: /get is a standalone page
 * outside the Vite bundle and could not import from src/, and this has to run as
 * a render-blocking <head> script anyway — it stamps data-platform on <html>
 * before first paint, so the install affordance never flashes the wrong variant
 * on its way to the right one.
 *
 * External file, not inline: the CSP sets script-src 'self' with no
 * unsafe-inline, so an inline block is dropped silently.
 */
(function () {
  function detect() {
    var ua = navigator.userAgent || "";
    var uaData = navigator.userAgentData;

    // Client hints are authoritative where implemented (Chromium). Safari and
    // Firefox do not ship them, so the UA string carries every other case.
    if (uaData && String(uaData.platform || "").toLowerCase() === "android") {
      return "android";
    }
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipod|ipad/i.test(ua)) return "ios";
    // iPadOS 13+ claims a desktop Safari UA. Multi-touch is the only tell left.
    if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
    return "desktop";
  }

  var platform = detect();

  window.UKTI_PLATFORM = platform;
  document.documentElement.setAttribute("data-platform", platform);

  /**
   * Store URL for this device, or "" on desktop and when config.js has not
   * populated the URLs. Reads UKTI_CONFIG at call time, so load order between
   * this file and config.js does not matter.
   */
  window.uktiStoreUrl = function () {
    var cfg = window.UKTI_CONFIG || {};
    if (platform === "ios") return cfg.appStoreUrl || "";
    if (platform === "android") return cfg.playStoreUrl || "";
    return "";
  };
})();
