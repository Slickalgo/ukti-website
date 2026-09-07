/**
 * Derives the site's favicon and touch-icon set from the real app icon.
 *
 * The master is brand/app-icon.png, copied byte-for-byte from the iOS
 * AppIcon.appiconset 1024 slice — so the icon in a browser tab is the same
 * artwork as the icon on the home screen. Before this, the site shipped a
 * hand-drawn SVG "U" that appeared nowhere else in the product.
 *
 * It lives in brand/ rather than public/ deliberately: public/ is published
 * verbatim, and nothing on the site references the 1024 master, so keeping it
 * there shipped ~900KB to the CDN that no page would ever request.
 *
 * Derived here rather than committed as eight PNGs so that replacing the app
 * icon is a one-file change: drop in a new app-icon.png and rebuild.
 *
 * Sizes, and who actually reads each one:
 *   favicon-16/32   — browser tabs, bookmarks.
 *   favicon-96      — Windows taskbar pin, some feed readers.
 *   apple-touch-180 — iOS "Add to Home Screen". iOS applies its own rounding
 *                     and refuses transparency, so this is flattened.
 *   icon-192/512    — Android home screen + the web manifest.
 *
 * The master is 1024 square with no alpha, so every size is a pure downscale;
 * `fit: "cover"` is defensive, for the day someone drops in a non-square file.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const master = path.join(root, "brand", "app-icon.png");

if (!fs.existsSync(master)) {
  console.error(
    "\n[build-app-icons] BUILD STOPPED\n\n" +
      "  ✗ brand/app-icon.png is missing.\n" +
      "    It is the 1024 slice of the iOS AppIcon.appiconset. Restore it with:\n" +
      "      cp ../ukti-ios/Ukti/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png \\\n" +
      "         brand/app-icon.png\n",
  );
  process.exit(1);
}

const OUTPUTS = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-96.png", size: 96 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

// Always regenerated, never cached. An mtime check was tried first and was a
// trap: `cp -p` a new master into place and its mtime is the *source's*, which
// is older than the derived files, so every icon silently stays stale while the
// build still reports success. Six resizes of a 1024 PNG cost ~200ms — cheaper
// than one afternoon wondering why the favicon did not change.
for (const { name, size } of OUTPUTS) {
  await sharp(master)
    .resize(size, size, { fit: "cover" })
    .flatten({ background: "#0D0B0A" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, name));
}

console.log(
  `[build-app-icons] ${OUTPUTS.length} sizes from app-icon.png ` +
    `(${OUTPUTS.map((o) => o.size).join(", ")}px)`,
);
