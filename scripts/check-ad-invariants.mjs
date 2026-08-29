/**
 * Build gate for the two traps that let the Meta Pixel ship wrong.
 *
 * Both were live findings, not hypotheticals:
 *
 *   1. The privacy policy states that no advertising pixel runs on the site.
 *      Pasting a Pixel ID into public/config.js makes that statement false the
 *      moment it deploys — a legal problem, and one nothing in the build noticed.
 *
 *   2. The CSP omitted connect.facebook.net for months while tracking.js sat
 *      wired and waiting. Enabling the Pixel would have failed *silently*: the
 *      script is blocked, no events fire, and Ads Manager just shows zero
 *      conversions with no error anywhere.
 *
 * Neither is detectable by reading one file, which is exactly why they survived.
 * Fails the build rather than warning — a warning in a build log is how both of
 * these got missed the first time.
 */
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const PIXEL_HOSTS = [
  // script-src — the base snippet's CDN
  "https://connect.facebook.net",
  // img-src + connect-src — where the pixel actually beacons to
  "https://www.facebook.com",
];

// The sentence in privacy.html that a live Pixel would contradict.
const NO_PIXEL_CLAIM = "No advertising pixel";

const errors = [];

const pixelId = (read("public/config.js").match(/metaPixelId:\s*"([^"]*)"/) || [])[1];
if (pixelId === undefined) {
  errors.push(
    "public/config.js: could not find metaPixelId. This gate reads it by pattern —\n" +
      "  if the field was renamed, update scripts/check-ad-invariants.mjs to match.",
  );
}

const pixelEnabled = Boolean(pixelId);

if (pixelEnabled) {
  if (read("privacy.html").includes(NO_PIXEL_CLAIM)) {
    errors.push(
      `metaPixelId is set ("${pixelId}") but privacy.html still says "${NO_PIXEL_CLAIM}".\n` +
        "  Shipping this makes the privacy policy false. Update the policy copy first —\n" +
        "  section 5 (Operational telemetry) and section 8 (Cookies and tracking).",
    );
  }

  const csp = read("vercel.json");
  const missing = PIXEL_HOSTS.filter((h) => !csp.includes(h));
  if (missing.length) {
    errors.push(
      `metaPixelId is set but the CSP in vercel.json omits: ${missing.join(", ")}.\n` +
        "  The Pixel would be blocked and would fail silently — no console error the\n" +
        "  marketing side would ever see, just zero conversions in Ads Manager.",
    );
  }
}

if (errors.length) {
  console.error("\n[check-ad-invariants] BUILD STOPPED\n");
  for (const e of errors) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}

console.log(
  `[check-ad-invariants] ok — pixel ${pixelEnabled ? "ENABLED, policy + CSP consistent" : "disabled"}`,
);
