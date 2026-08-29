# Deploy runbook — Vercel (native GitHub integration)

UKTI marketing site deploys to **Vercel** via Vercel's native GitHub integration. Push to `main` → Vercel auto-deploys. No GitHub Actions workflow, no GH Secrets, no Vercel CLI required.

Migrated from AWS Amplify on 2026-04-25.

---

## Current infrastructure

| Thing | Value |
|---|---|
| Deploy target | Vercel (production) |
| Project name | `ukti-marketing` (set in Vercel dashboard during initial repo link) |
| Region | Vercel's edge network (auto, anycast) |
| Production URL | `<project>.vercel.app` until DNS cuts over to `ukti.io` |
| Target production domain | `ukti.io` (DNS flip planned for V1 launch) |
| Deploying branch | `main` (preview deploys on every other branch) |
| GitHub repo | `git@github.com:Slickalgo/ukti-website.git` |
| Build command | `npm run build` (= `npm run prebuild && vite build`, set in `vercel.json`) |
| Build output | `dist/` (set in `vercel.json` → `outputDirectory`) |
| Install command | `npm install --no-audit --no-fund` (set in `vercel.json`) |
| Build container | Vercel's native build infrastructure |
| Security headers | `vercel.json` → `headers` (live source of truth) |
| GitHub Actions | None — Vercel watches the repo natively |

## How it deploys

```
  git push origin main
        │
        ▼
  Vercel GitHub integration detects the push
        │
        ▼
  Vercel build container:
    ├─ npm install --no-audit --no-fund   (sharp native bindings)
    ├─ npm run build
    │     ├─ prebuild: image optimization + og-cover + QR generation
    │     └─ vite build → dist/
    └─ ship dist/ to Vercel edge
        │
        ▼
  Live on Vercel edge (~60-90s typical)
```

Every push to a non-main branch creates a **preview deployment** at a unique URL. Open a PR → Vercel posts a comment with the preview URL.

## First-time setup (one-time, by Founder)

1. Go to **vercel.com/new**
2. Click **Import Git Repository** → authorize the Slickalgo GitHub org if not already
3. Pick `ukti-website`
4. **Framework Preset:** "Vite" (or "Other" — `vercel.json` overrides either way)
5. Don't override Build Command, Output Directory, or Install Command — `vercel.json` is the source of truth
6. Click **Deploy**

That's it. No GH Secrets, no CLI.

## Custom domain cutover (when ready)

1. Vercel dashboard → Project → **Settings → Domains** → add `ukti.io` and `www.ukti.io`. Vercel surfaces the required DNS records.
2. **Cloudflare DNS** (per follow-ups §A-8: domain on Cloudflare) — update records:
   - `A @ 76.76.21.21` (Vercel anycast)
   - `CNAME www cname.vercel-dns.com`
   - Set Cloudflare proxy: **"DNS only"** (gray cloud) — Vercel handles SSL + edge caching natively. Cloudflare-on-top is double-CDN; usually unnecessary.
3. Wait ~30s for SSL cert provisioning (Vercel issues Let's Encrypt automatically).
4. Verify: `curl -sI https://ukti.io` → `HTTP 200`, `server: Vercel`.
5. **Only then** decommission Amplify (avoid serving stale content during DNS propagation).

## Rollback

Vercel deployments are immutable + indexed:

- **Dashboard:** Vercel → Project → Deployments → click previous deployment → **"Promote to production"**. One click; ~5 sec.
- **Git:** revert the commit + push. Same flow, ~90 sec.

## Pre-launch noindex

`<meta name="robots" content="noindex, nofollow" />` is hardcoded in:
- `index.html`
- `privacy.html`
- `terms.html`

Remove before V1 public launch (week of May 11–17, 2026). One-line edit per file.

## Vercel Speed Insights

Already wired via `@vercel/speed-insights` (in `package.json` dependencies). Auto-collects Core Web Vitals when deployed on Vercel. CSP at `vercel.json` already allows `https://va.vercel-scripts.com` + `https://vitals.vercel-insights.com`.

Dashboard: Vercel project → **Speed Insights** tab.

## Source of truth

`vercel.json` pins all build settings so the dashboard preset choice doesn't matter:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install --no-audit --no-fund",
  "framework": "vite",
  ...
}
```

If you ever want to change build behavior, edit `vercel.json` — don't change it in the Vercel dashboard. (Dashboard changes drift from git; vercel.json is the canonical config.)

## Common issues + fixes

**Build fails: "sharp linux-x64 binary not found":**
- Cause: `npm ci` was used somewhere (lockfile-strict; macOS lockfile doesn't include linux-x64 optional deps)
- Fix: `vercel.json` already specifies `"installCommand": "npm install --no-audit --no-fund"` — verify it's intact

**Build succeeds but deploy returns 404 for a new page:**
- Cause: `vercel.json` rewrites missing for the new route
- Fix: add a rewrite entry: `{ "source": "/<route>", "destination": "/<route>.html" }`

**Preview deploys not appearing on PRs:**
- Cause: GitHub integration not authorized for the Slickalgo org
- Fix: Vercel dashboard → Settings → Git → "Manage GitHub installation" → ensure ukti-website is in the allowed-repos list

**SSL cert pending after DNS flip:**
- Cause: DNS hasn't propagated yet OR Cloudflare proxy is on (orange cloud)
- Fix: Cloudflare → set to "DNS only" (gray cloud); wait 5-10 min; verify `dig +short ukti.io` returns Vercel's `76.76.21.21`

---

## Migration history

**2026-04-25 (this commit):** Native Vercel GitHub integration replaces CLI-based deploy
- Deleted `.github/workflows/deploy-vercel.yml` (CI-based deploy, required `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` GH Secrets)
- Vercel watches the repo natively now
- Net simpler: zero workflow files, zero GH Secrets, zero CLI dependencies for deploy

**2026-04-25 (earlier):** Amplify → Vercel CLI migration
- Replaced `.github/workflows/deploy-amplify.yml` with `deploy-vercel.yml`
- Required 3 Vercel GH Secrets
- Superseded a few hours later by native integration (this doc)

**Decommission AWS Amplify** (Founder action, defer to post-DNS-cutover):
- Cancel Amplify app `d1y2gv5w126dto` after DNS resolves to Vercel
- Remove old GH Secrets if any remain: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AMPLIFY_APP_ID`, `AMPLIFY_BRANCH_NAME`
- IAM: revoke `bapu` user's `AmplifyDeployer` policy
- Cost: Amplify hosting tier was ~$0.01-0.15/month — negligible loss

**Original Amplify runbook content** retrievable via:
```
git log --diff-filter=D -- docs/deploy/amplify.md
git show <commit>:docs/deploy/amplify.md
```

**Amplify-era `customHttp.yml`** (deleted 2026-08-29) — the Amplify Console
custom-headers file. It described itself as the canonical source of truth, but it
had not served a byte since the Vercel migration: the live headers come from the
`headers` block in `vercel.json`. Editing it would have changed nothing in production.
Its header set was verified equivalent before deletion (only intentional deltas:
Vercel Analytics hosts in `script-src`/`connect-src`, HSTS raised 1y → 2y, and
`data:` dropped from `font-src` — unused, all fonts are self-hosted `.woff2`).
Retrievable via:
```
git log --diff-filter=D -- customHttp.yml
git show <commit>:customHttp.yml
```
