import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = "/Users/bapu/Desktop/designer/style-ai-repos";
const SRC = path.join(ROOT, "Ukti-website_design/uploads");
const DST = path.join(ROOT, "ukti-website/public/images");

// Map of design upload → website public/images PNG slot.
// Mobile (3:4 portrait) only. The desktop (3:2 wide) crop lives at
// public/images/hero-wide.png and is sourced separately — do not clobber.
const MAP = [
  { src: "Hero portrait.jpg",  dst: ["hero.png"] },
  { src: "one-pull.jpg",        dst: ["one-pull.png"] },
  { src: "week-tue.jpg",        dst: ["week-tue.png"] },
  { src: "week-wed.jpg",        dst: ["week-wed.png"] },
  { src: "week-thu.jpg",        dst: ["week-thu.png"] },
  { src: "week-fri.jpg",        dst: ["week-fri.png"] },
];

for (const { src, dst } of MAP) {
  const inPath = path.join(SRC, src);
  if (!fs.existsSync(inPath)) {
    console.warn(`  skip · missing ${src}`);
    continue;
  }
  const buf = await sharp(inPath).png({ compressionLevel: 9 }).toBuffer();
  for (const slot of dst) {
    const out = path.join(DST, slot);
    fs.writeFileSync(out, buf);
    console.log(`  wrote ${slot} (${(buf.length / 1024).toFixed(0)}KB) ← ${src}`);
  }
}
