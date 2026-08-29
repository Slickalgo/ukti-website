# Ukti — marketing site

Static editorial site for ukti.io. Vite + vanilla HTML + Tailwind + self-hosted
Fraunces + IBM Plex Mono + Sharp AVIF/WebP pipeline. Deployed to Vercel —
see `docs/deploy/vercel.md` for the pipeline runbook.

```bash
npm install
npm run dev
```

Production build output is written to `dist/` (`npm run build`, then `npm run preview`).

## Pre-commit hooks (secret scanning)

`.pre-commit-config.yaml` at repo root configures [gitleaks](https://github.com/gitleaks/gitleaks) to scan every commit for accidentally staged credentials before they reach the remote.

Install once per dev machine:

```bash
pip install pre-commit
pre-commit install
```

After that, `gitleaks` runs automatically on every `git commit`. To scan the full history manually:

```bash
pre-commit run --all-files
```
