/**
 * /get — the short URL handed out anywhere (QR code, printed card, WhatsApp)
 * and the destination of every paid Meta ad. A phone is redirected to its own
 * store; desktop stays put and gets the fallback UI in get.html.
 *
 * Two jobs, and the second one is why this file is not trivial:
 *
 * 1. Route to the right store.
 * 2. Carry ad attribution across the store bounce. A tap on
 *    /get?utm_source=meta&utm_campaign=x&fbclid=y used to redirect to a bare
 *    store URL, dropping every param — so a paid install arrived indistinguishable
 *    from an organic one. src/tracking.js has preserveUtmOnStoreLinks() for this,
 *    but it is in the Vite bundle behind main.js, which /get does not load, and
 *    it only rewrites anchor hrefs — never the location.replace() below.
 *
 * The two stores take attribution in different, non-interchangeable formats:
 *   Apple  — ct (campaign) + pt (provider), surfaced in App Analytics.
 *            utm_* are ignored, so they are not appended.
 *   Google — a single `referrer` param holding the encoded utm string, read
 *            back through the Play Install Referrer API.
 *
 * Detection is inlined rather than taken from /platform.js: this page has no
 * platform-conditional CSS, so it needs the branch and not the <html> stamp,
 * and dropping the dependency takes a render-blocking request out of the
 * critical path — which is inside Meta's in-app browser on a phone on mobile
 * data. Store URLs still come from /config.js so they cannot drift.
 *
 * External file, not inline: the CSP sets script-src 'self' with no
 * unsafe-inline, so an inline block would be dropped and every phone would
 * silently strand on the desktop fallback.
 */
(function () {
  var FORWARD = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
  ];

  function platform() {
    var ua = navigator.userAgent || "";
    var uaData = navigator.userAgentData;
    if (uaData && String(uaData.platform || "").toLowerCase() === "android") {
      return "android";
    }
    if (/android/i.test(ua)) return "android";
    if (/iphone|ipod|ipad/i.test(ua)) return "ios";
    // iPadOS 13+ claims a desktop Safari UA. Multi-touch is the only tell left.
    if (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return "ios";
    return "desktop";
  }

  /** Allowlisted campaign params present on the current URL. */
  function inbound() {
    var here = new URLSearchParams(window.location.search);
    var out = new URLSearchParams();
    for (var i = 0; i < FORWARD.length; i++) {
      var v = here.get(FORWARD[i]);
      if (v) out.set(FORWARD[i], v);
    }
    // Apple's own tokens, when an ad passes them through directly.
    ["ct", "pt"].forEach(function (k) {
      var v = here.get(k);
      if (v) out.set(k, v);
    });
    return out;
  }

  /**
   * Store URL with attribution attached in that store's format. Returns the
   * URL untouched when there is nothing to attach, so an organic /get scan
   * is not decorated with empty params.
   */
  function withAttribution(storeUrl, os, params) {
    if (!storeUrl) return "";
    var keys = [];
    params.forEach(function (_v, k) {
      keys.push(k);
    });
    if (keys.length === 0) return storeUrl;

    var url;
    try {
      url = new URL(storeUrl);
    } catch (e) {
      return storeUrl;
    }

    if (os === "ios") {
      // Apple reads ct/pt only. Fall back to the campaign name when the ad did
      // not set an explicit campaign token.
      var ct = params.get("ct") || params.get("utm_campaign");
      var pt = params.get("pt");
      if (ct) url.searchParams.set("ct", ct);
      if (pt) url.searchParams.set("pt", pt);
      return url.toString();
    }

    if (os === "android") {
      // Play takes one opaque `referrer`; URLSearchParams encodes it for us.
      var referrer = new URLSearchParams();
      params.forEach(function (v, k) {
        if (k !== "ct" && k !== "pt") referrer.set(k, v);
      });
      var encoded = referrer.toString();
      if (encoded) url.searchParams.set("referrer", encoded);
      return url.toString();
    }

    return url.toString();
  }

  var cfg = window.UKTI_CONFIG || {};
  var os = platform();
  var params = inbound();
  var storeUrl =
    os === "ios" ? cfg.appStoreUrl || "" : os === "android" ? cfg.playStoreUrl || "" : "";

  if (storeUrl) {
    // replace() rather than assign() — /get is a waypoint, not a destination,
    // and should not sit in history eating the phone's back button.
    window.location.replace(withAttribution(storeUrl, os, params));
    return;
  }

  // Desktop, unknown device, or unpopulated config: fall through to the page,
  // but still carry attribution onto the badges the visitor is about to tap.
  function stampBadges() {
    var pills = document.querySelectorAll(".pill");
    for (var i = 0; i < pills.length; i++) {
      var href = pills[i].getAttribute("href") || "";
      var target = /apps\.apple\.com/.test(href)
        ? "ios"
        : /play\.google\.com/.test(href)
          ? "android"
          : "";
      if (target) pills[i].setAttribute("href", withAttribution(href, target, params));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", stampBadges);
  } else {
    stampBadges();
  }
})();
