/**
 * Build gate for the canonical-host trap that kept the site out of the index.
 *
 * The live finding, 2026-09-07: Vercel served the apex as a 307 to www, while
 * every rel="canonical" and every sitemap <loc> named the apex. So Google
 * fetched https://ukti.io/x from the sitemap, was redirected to www, and the
 * page that arrived told it "the canonical is https://ukti.io/x" — the URL it
 * had just been redirected away from. Search Console recorded exactly that:
 * one "Page with redirect" and one "Alternative page with proper canonical
 * tag", both un-indexed.
 *
 * Nothing in the repo was wrong on its own. The repo was internally consistent
 * and consistently apex; the contradiction only existed between the repo and a
 * domain setting in a dashboard nobody diffs. That is why this gate exists and
 * why it prints the dashboard state it cannot see.
 *
 * What it enforces:
 *   1. One declared origin, used by every canonical, og:url, sitemap loc and
 *      the robots.txt Sitemap line. No page may name a different host.
 *   2. Every indexable page appears in the sitemap exactly once.
 *   3. Every noindex page is absent from the sitemap (shipping a noindex URL
 *      in a sitemap is a direct Search Console error).
 *   4. Every sitemap path is actually routable — it has a vercel.json rewrite,
 *      so a renamed file cannot leave a 404 advertised to crawlers.
 *   5. Every page's ".html" spelling permanently redirects to its clean path.
 *      With cleanUrls off, /privacy and /privacy.html both returned 200 and
 *      served identical bytes — the same page at two URLs, which is the other
 *      half of what Search Console reports as duplicate content.
 *
 * What it cannot enforce, and must not pretend to: whether CANONICAL_ORIGIN is
 * the host Vercel actually serves 200 for. That lives in Project → Settings →
 * Domains. If the primary domain is ever flipped, change CANONICAL_ORIGIN here
 * in the same change, or this whole class of bug comes straight back.
 */
import { readFileSync } from "node:fs";

// Must equal the PRIMARY domain in Vercel → Project → Settings → Domains.
// The other host must redirect to it, not the reverse.
const CANONICAL_ORIGIN = "https://ukti.io";

// path → source file. `noindex: true` means "must NOT be in the sitemap".
const PAGES = [
  { path: "/", file: "index.html" },
  { path: "/how-it-works", file: "how-it-works.html" },
  { path: "/support", file: "support.html" },
  { path: "/press", file: "press.html" },
  { path: "/delete-account", file: "delete-account.html" },
  { path: "/privacy", file: "privacy.html" },
  { path: "/terms", file: "terms.html" },
  { path: "/get", file: "public/get.html", noindex: true },
];

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const errors = [];

const sitemap = read("public/sitemap.xml");
const robots = read("public/robots.txt");
const vercel = JSON.parse(read("vercel.json"));

const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const rewriteSources = new Set((vercel.rewrites || []).map((r) => r.source));
const redirects = new Map(
  (vercel.redirects || []).map((r) => [r.source, { to: r.destination, permanent: r.permanent }]),
);

// --- 1. every declared URL sits on the one canonical origin ----------------
const offHost = (url) => !url.startsWith(`${CANONICAL_ORIGIN}/`);

for (const { path, file, noindex } of PAGES) {
  const html = read(file);
  const expected = `${CANONICAL_ORIGIN}${path}`;

  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  if (noindex) {
    if (canonical) {
      errors.push(`${file}: is noindex but declares a canonical (${canonical}). Remove it.`);
    }
  } else if (!canonical) {
    errors.push(`${file}: no <link rel="canonical">.`);
  } else if (canonical !== expected) {
    errors.push(`${file}: canonical is "${canonical}", expected "${expected}".`);
  }

  const ogUrl = (html.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
  if (ogUrl && ogUrl !== expected) {
    errors.push(`${file}: og:url is "${ogUrl}", expected "${expected}".`);
  }

  // --- 2 + 3. sitemap membership matches indexability ---------------------
  const inSitemap = locs.filter((l) => l === expected).length;
  if (noindex && inSitemap) {
    errors.push(
      `public/sitemap.xml: lists ${expected}, but ${file} is noindex.\n` +
        "  A noindex URL in a sitemap is reported as an error in Search Console.",
    );
  }
  if (!noindex && inSitemap !== 1) {
    errors.push(
      `public/sitemap.xml: ${expected} appears ${inSitemap} times, expected exactly 1.`,
    );
  }
}

for (const loc of locs.filter(offHost)) {
  errors.push(`public/sitemap.xml: <loc>${loc}</loc> is not on ${CANONICAL_ORIGIN}.`);
}

// --- 5. the ".html" spelling of every page redirects to the clean path -----
for (const { path, file } of PAGES) {
  const htmlPath = `/${file.replace(/^public\//, "")}`;
  const cleanTarget = path === "/" ? "/" : path;
  const rule = redirects.get(htmlPath);
  if (!rule) {
    errors.push(
      `vercel.json: no redirect for "${htmlPath}".\n` +
        `  Without it ${htmlPath} and ${cleanTarget} both return 200 with identical bytes —\n` +
        "  one page at two URLs, which is duplicate content to a crawler.",
    );
  } else if (rule.to !== cleanTarget) {
    errors.push(`vercel.json: "${htmlPath}" redirects to "${rule.to}", expected "${cleanTarget}".`);
  } else if (rule.permanent !== true) {
    errors.push(
      `vercel.json: the "${htmlPath}" redirect is not permanent.\n` +
        "  A 307 tells Google to keep the old URL; only a 308 consolidates it.",
    );
  }
}

// --- 4. every advertised path is routable ---------------------------------
for (const loc of locs) {
  const path = loc.slice(CANONICAL_ORIGIN.length);
  if (path !== "/" && !rewriteSources.has(path)) {
    errors.push(
      `public/sitemap.xml advertises ${loc}, but vercel.json has no rewrite for "${path}".\n` +
        "  Without one the URL 404s for crawlers while the sitemap insists it exists.",
    );
  }
}

// --- robots.txt points at the sitemap on the same origin ------------------
const sitemapLine = (robots.match(/^Sitemap:\s*(\S+)/m) || [])[1];
if (sitemapLine !== `${CANONICAL_ORIGIN}/sitemap.xml`) {
  errors.push(
    `public/robots.txt: Sitemap line is "${sitemapLine}", ` +
      `expected "${CANONICAL_ORIGIN}/sitemap.xml".`,
  );
}

if (errors.length) {
  console.error("\n[check-seo-invariants] BUILD STOPPED\n");
  for (const e of errors) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}

console.log(
  `[check-seo-invariants] ok — ${PAGES.length - 1} indexable pages on ${CANONICAL_ORIGIN}, ` +
    "1 noindex page held out of the sitemap",
);
