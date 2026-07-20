/**
 * Generate the editorial QR code for the desktop install-handoff at Beat 6.
 *
 *   URL encoded:     https://ukti.io/get  (matches public/config.js `shortUrl`)
 *   Error correction: M (15%, standard — M is the editorial-safe default)
 *   Colors:           ink on paper (not black-on-white — keeps the page's palette)
 *   Margin:           1 module (tight; the QR will sit inside a framed container)
 *
 * The QR is static content. The encoded URL only changes on DNS strategy changes,
 * so this script doesn't need to run every build — but it's wired into `prebuild`
 * anyway so a drifted URL can't silently persist. Output is deterministic.
 *
 * The URL is read out of public/config.js rather than restated here: a QR that
 * disagrees with `shortUrl` is unfixable once it's printed on something, and the
 * failure is invisible until someone scans it.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "public", "images", "qr.svg");

// config.js is a browser file that assigns window.UKTI_CONFIG — run it against a
// stub window to read the value rather than regex-scraping it.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "public", "config.js"), "utf8"), sandbox);

const URL_ENCODED = sandbox.window.UKTI_CONFIG?.shortUrl;
if (!URL_ENCODED) {
  throw new Error("[build-qr] public/config.js did not define UKTI_CONFIG.shortUrl");
}

const svg = await QRCode.toString(URL_ENCODED, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 1,
  color: {
    dark: "#0D0B0A",  // ink
    light: "#F5F1EA", // paper — matches the site canvas so the QR sits flush
  },
});

fs.writeFileSync(out, svg);
console.log(
  `[build-qr] wrote ${path.relative(root, out)} (${(svg.length / 1024).toFixed(1)} KB) → ${URL_ENCODED}`,
);
