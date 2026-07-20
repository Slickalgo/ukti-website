# Pre-production blockers — UKTI marketing site

Single source of truth for what must land BEFORE we can:
- Buy Meta traffic (attribution + measurement)
- Claim `ukti.io` as the canonical production domain
- Open the App Store + Play Store install funnel

Launch window: **week of May 11–17, 2026** (DNS flip target).

Each item below has placeholder infrastructure already wired into the repo — once the real value arrives, it's a one-line swap + deploy. Pre-production means: don't buy ad spend or announce publicly until all 🔴 items are ✅.

---

## 🔴 1. Meta Business Manager + Pixel

**Status:** placeholder wired. Pixel ID empty. No events firing.

**What needs to happen:**
- [ ] Create Meta Business Manager account in Ukti's name (company-level, not personal)
- [ ] Provision Pixel inside Business Manager → copy the 15-digit **Pixel ID**
- [ ] Paste ID into `public/config.js` → `metaPixelId` field
- [ ] Deploy — the Pixel auto-initializes when the ID is non-empty
- [ ] Verify events fire in Meta Events Manager → test browser
- [ ] **Domain verification**: add `ukti.io` to Business Manager and verify via meta tag or DNS TXT record
- [ ] (V1.1) Configure CAPI (Conversions API) — server-side event forwarding
  - Required for iOS 17+ attribution beyond the ~50% client-side signal ceiling
  - Options: Amplify Lambda@Edge function / third-party CAPI Gateway (Segment, Stape, Tealium)
  - **Minimum viable for launch: client-side Pixel only.** CAPI can be post-launch.

**Events the Pixel will fire automatically once configured:**

| Event | Trigger |
|---|---|
| `PageView` | Every page load |
| `ViewContent` | Beat 6 ("Your turn.") enters viewport |
| `Lead` | Store pill (App Store / Google Play) is clicked |

**Files to touch when ready:** `public/config.js` only.

---

## 🟡 2. App Store + Google Play URLs

**Status:** real URLs wired in 2026-07-20. Both still return 404 until the apps are published.

**Live URLs in code:**
- iOS: `https://apps.apple.com/app/id6782030430`
- Android: `https://play.google.com/store/apps/details?id=io.ukti.app`
- `apple-itunes-app` meta: `app-id=6782030430`

`public/config.js` is the source of truth. The `<a class="store-pill">` anchors in
`index.html` + `how-it-works.html` + `public/get.html` duplicate the strings as the
no-JS fallback, so a URL change means editing those three too.

**What still needs to happen:**
- [ ] Publish iOS build → confirm `apps.apple.com/app/id6782030430` resolves (Apple's
      `itunes.apple.com/lookup?id=6782030430` returns `resultCount: 0` while unreleased)
- [ ] Publish Android build to production → confirm the Play URL resolves
- [ ] Deploy + test on real devices: scan the QR from an iPhone and an Android phone,
      tap both hero CTAs on each, and load the site on a desktop to confirm the QR shows

**Device routing (built 2026-07-20):** `public/platform.js` detects the device and stamps
`data-platform` on `<html>` before first paint. `src/install.js` points the two hero CTAs
at the matching store on a phone and leaves the `#your-turn` jump in place on desktop;
`src/style.css` swaps Beat 6 between badges and the QR off the same attribute.
`public/get.js` runs the same detection at `/get`, which is what the QR encodes.

---

## 🔴 3. Custom domain — ukti.io

**Status:** domain is registered (assumed). Site currently serves at `https://main.d1y2gv5w126dto.amplifyapp.com`.

**What needs to happen:**
- [ ] In AWS Amplify console (or via `aws amplify create-domain-association`), attach `ukti.io` as custom domain
  - Amplify auto-provisions an ACM certificate
  - Add the CNAME / A records at your DNS registrar (Amplify gives you the values)
  - Cert validation: ~10-60 min
- [ ] Verify all four URLs work:
  - `https://ukti.io` → site
  - `https://www.ukti.io` → redirect to apex or mirror
  - `https://ukti.io/get` → smart redirect (see §4)
  - `https://ukti.io/og-cover.jpg` → OG card
- [ ] Confirm HTTPS, HSTS header present
- [ ] Update site canonical URLs if any are still pointing at `main.d1y2gv5w126dto.amplifyapp.com`
  - Search: `grep -r d1y2gv5w126dto` — should be empty in production HTML (docs are fine)

**Files to touch when ready:** none in repo — pure AWS infra + DNS.

---

## 🔴 4. `ukti.io/get` — smart redirect

**Status:** `public/get.html` exists with placeholder URLs. Device detection logic is live. Waiting on §2 (real store URLs) + §3 (custom domain).

**What it does:**
- Detects `navigator.userAgent`
- iOS → `window.location = appStoreUrl`
- Android → `window.location = playStoreUrl`
- Desktop / unknown → stays on page and shows both pills + QR instructions

**Depends on:** §2 (real URLs to redirect to), §3 (custom domain so QR codes point at `ukti.io/get` not `amplifyapp.com/get`).

**Once §2 + §3 are done:** `/get` just starts routing correctly, no code change.

---

## 🟡 5. Hero imagery for desktop

**Status:** desktop currently serves the 3:4 mobile hero cropped into a 16:9 viewport — Creative flagged this as "guillotines the arched window + floor shadow, reads like product not magazine."

**What needs to happen:**
- [ ] Generate `hero-wide.png` (3:2 aspect, ≥ 1800×1200) via the Ukti app render pipeline
  - Prompt: documented in `ukti-os/teams/creative/drafts/2026-04-22-marketing-website-ai-image-prompts.md`
  - Same subject + wardrobe + lighting as the existing `hero.png`, wider composition
- [ ] QA: does it match ad-creative continuity per Marketing's ad-site consistency requirement
- [ ] Drop into `public/images/hero-wide.png`
- [ ] `npm run build` — `scripts/optimize-images.mjs` will auto-emit AVIF + WebP at 720/1440/1920
- [ ] Wire into `<picture>` via `<source media="(min-width: 1024px)">`
- [ ] Deploy

**Optional (V1.1):** `section-break.png` (21:9 atmospheric) for desktop section dividers. Prompt documented. Not a launch blocker.

---

## 🟡 6. week-wed.png regeneration

**Status:** Creative flagged in the initial 6-agent review as "breaks the set" — the only image shot on dark espresso wood vs the other three on plaster. Reads like a different publication.

**What needs to happen:**
- [ ] Regenerate with the existing week-wed prompt but force the plaster-background setting (see creative prompts doc)
- [ ] QA alongside tue/thu/fri
- [ ] Drop into `public/images/week-wed.png` (replaces current file)
- [ ] `npm run build` — auto-emits optimized variants
- [ ] Deploy

Not a strict launch blocker, but the founder agreed to address before launch week.

---

## 🟡 7. Legal content — /privacy + /terms

**Status:** stub content inherited from pre-rebrand UKTI era. Voice has been refreshed but substance needs a legal-writer pass.

**What needs to happen:**
- [ ] Legal writer extends `privacy.html` with current Ukti data-handling specifics (what the app collects, how it's stored, retention, deletion flow, cross-border transfer for Azure-hosted services)
- [ ] Legal writer extends `terms.html` with current Ukti service terms (subscription model if any, acceptable use, liability, termination)
- [ ] Copy must pass voice-system §2 forbidden words + read-aloud test
- [ ] Deploy

Founder has a legal writer lined up; scoping is the writer's job.

---

## 🟢 8. Observability (nice-to-have, post-launch)

Not blockers. Worth doing in the first 30 days.

- CloudWatch alarm on Amplify deploy failures (SNS → email/Slack)
- Status badge in README linking to latest deploy
- Verify Amplify's default cache-control headers for `/images/*.{avif,webp,png}` and `/fonts/*.woff2` — add explicit `public, max-age=31536000, immutable` if missing

---

## Summary table

| # | Item | Owner | Blocks ad spend? | Blocks ukti.io launch? |
|---|---|---|:-:|:-:|
| 1 | Meta Pixel ID | founder (Meta Business) | 🔴 yes | 🟡 no |
| 2 | App Store + Play URLs | founder (stores) | 🔴 yes | 🔴 yes |
| 3 | Custom domain ukti.io | founder (AWS + DNS) | — | 🔴 yes |
| 4 | /get smart redirect | automatic once 2+3 done | — | 🟡 no |
| 5 | hero-wide.png | founder (Ukti pipeline) | 🟡 no (mobile hero still serves) | 🟡 no |
| 6 | week-wed.png regen | founder (Ukti pipeline) | — | — |
| 7 | /privacy + /terms | legal writer | 🟡 depends on regulator | 🔴 yes |
| 8 | Observability | me | — | — |

**🔴 = launch-blocker · 🟡 = soft blocker · 🟢 = post-launch polish**
