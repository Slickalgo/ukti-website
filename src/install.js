/**
 * Install routing — sends the two hero CTAs ("→ INSTALL", "Pull your first
 * look") to the right destination for whatever device is reading the page.
 *
 *   iOS / Android → straight to that platform's store, one tap, no waypoint
 *   desktop       → the in-page jump to Beat 6, where the QR hands off to a phone
 *
 * Progressive enhancement: both CTAs ship as href="#your-turn", so a visitor
 * with no JS still lands on a surface carrying both store badges and the QR.
 * Only the phone case is an upgrade over that baseline, and it only applies once
 * config.js has real store URLs — an empty config leaves the anchor untouched.
 *
 * Detection is not done here; public/platform.js has already run as a
 * render-blocking head script and published the result. See that file for why.
 *
 * Runs at module-eval, which for a deferred module means the CTAs are parsed and
 * tracking.js has not booted yet — so the hrefs are rewritten before attribution
 * params are stamped onto them. Keep this import ahead of tracking.js in main.js.
 */

const CTA_SELECTOR = ".install-link, .cta-pill";

function routeInstallCtas() {
  const storeUrl =
    typeof window.uktiStoreUrl === "function" ? window.uktiStoreUrl() : "";
  if (!storeUrl) return;

  document.querySelectorAll(CTA_SELECTOR).forEach((el) => {
    el.href = storeUrl;
    el.rel = "noopener";
    // Marks the anchor as an outbound store link so tracking.js picks it up for
    // UTM forwarding and the Lead event, same as the Beat 6 badges.
    el.setAttribute("data-store-link", window.UKTI_PLATFORM || "");
  });
}

routeInstallCtas();
