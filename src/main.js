// Ukti marketing site — runtime.
//
// - Verdict crossfade (Beat 1) — three curated outfits cycling on a slow timer.
// - Stone-rail progress (Beat 2 + Beat 4) — ink fill grows as section enters viewport.
// - Scroll-reveal — IntersectionObserver fade/translate, optional stagger groups.
// - Desktop-only Lenis smooth scroll.
// - Device-aware install CTAs — phones go to their store, desktop to the QR.
// - Vercel Speed Insights (operational telemetry — Core Web Vitals only).
// - Vercel Analytics (page views + visitor counts; no PII, no cross-site tracking).

import "./style.css";
import "lenis/dist/lenis.css";
import Lenis from "lenis";
import { injectSpeedInsights } from "@vercel/speed-insights";
import { inject as injectAnalytics } from "@vercel/analytics";
// Device-aware install CTAs. Must stay ahead of tracking.js: it rewrites the CTA
// hrefs that tracking then stamps attribution params onto.
import "./install.js";
// Attribution: Meta Pixel loader (no-op until UKTI_CONFIG.metaPixelId is set)
// + UTM preservation on store links. See docs/launch/pre-production-blockers.md §1.
import "./tracking.js";

const MD = 768;

// ── Verdict crossfade ────────────────────────────────────────────────
//
// Three curated outfits cycle on the hero. First visit teaches the grammar
// (rotation off via DEFAULT below); we ship rotation on so the demo carries
// the editorial texture. Pieces line crossfades to match.

const VERDICT_DEFAULTS = {
  index: 0,
  rotate: true,
  intervalMs: 6500,        // dwell per verdict (was 4500)
  firstRotationDelay: 2800, // hold the first verdict longer; lets the word-
                           // stagger land + the user actually read the line
};

function initVerdict() {
  const stack = document.querySelector("#hero .verdict-stack");
  if (!stack) return;

  const verdicts = stack.querySelectorAll(".verdict");
  if (!verdicts.length) return;

  const piecesStack = document.querySelector("#hero .pieces-stack");
  const piecesItems = piecesStack
    ? piecesStack.querySelectorAll(".pieces")
    : [];

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let idx = VERDICT_DEFAULTS.index;

  // Wrap each word of the initially-active verdict in <span class="word">
  // so the word-stagger CSS can fade them in sequence. <br> is preserved.
  // Only the first verdict gets wrapped — subsequent rotations cross-fade
  // as whole blocks via the existing data-active opacity transition.
  function wrapWords(verdict) {
    let wordIdx = 0;
    const fragment = document.createDocumentFragment();
    verdict.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/);
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
          } else {
            const span = document.createElement("span");
            span.className = "word";
            span.style.setProperty("--word-i", String(wordIdx++));
            span.textContent = part;
            fragment.appendChild(span);
          }
        }
      } else {
        fragment.appendChild(node.cloneNode(true));
      }
    });
    verdict.replaceChildren(fragment);
  }

  const initialActive = verdicts[idx];
  if (initialActive) wrapWords(initialActive);

  // Trigger word fade after two rAFs so the initial opacity-0 state paints.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => stack.classList.add("verdict-stack--booted")),
  );

  function show(next) {
    const i = ((next % verdicts.length) + verdicts.length) % verdicts.length;
    verdicts.forEach((node, j) => {
      node.setAttribute("data-active", j === i ? "1" : "0");
    });
    piecesItems.forEach((node, j) => {
      node.setAttribute("data-active", j === i ? "1" : "0");
    });
    idx = i;
  }

  if (!VERDICT_DEFAULTS.rotate || reduce) return;

  // Cycle ONCE through the variants, then return home and stop.
  // Magazine-cover-returns-to-masthead pattern: rotation as overture,
  // not jukebox. Total visible rotations = verdicts.length (each variant
  // shown once, ending back on verdict[0]).
  let rotations = 0;
  const totalRotations = verdicts.length;

  function tick() {
    show(idx + 1);
    rotations += 1;
    if (rotations < totalRotations) {
      setTimeout(tick, VERDICT_DEFAULTS.intervalMs);
    }
  }

  setTimeout(tick, VERDICT_DEFAULTS.firstRotationDelay);
}

// ── Stone-rail progress ──────────────────────────────────────────────
//
// Each [data-rail] section has a 2px hairline + ink fill that grows as
// the section enters the viewport. Sets --rail-progress (0..1) which the
// CSS pseudo-element `.stone-rail::after` reads as height.

function initStoneRail() {
  const rails = document.querySelectorAll("[data-rail]");
  if (!rails.length) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    rails.forEach((r) => r.style.setProperty("--rail-progress", "1"));
    return;
  }

  function update() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    rails.forEach((r) => {
      const rect = r.getBoundingClientRect();
      const start = vh * 0.85;
      const end = -rect.height + vh * 0.3;
      const t = (start - rect.top) / (start - end);
      const clamped = Math.max(0, Math.min(1, t));
      r.style.setProperty("--rail-progress", clamped.toFixed(3));
    });
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

// ── Scroll-reveal ─────────────────────────────────────────────────────
//
// Each element tagged with [data-reveal] fades/translates in once it
// enters the viewport. Elements inside a [data-stagger-group] read the
// group's stagger interval from `data-stagger-ms` and inherit an index
// via `data-stagger-index` so the CSS delay chain is deterministic.

function applyStaggerDelays() {
  document.querySelectorAll("[data-stagger-group]").forEach((group) => {
    const raw = group.getAttribute("data-stagger-ms");
    const step = raw ? Math.max(0, parseInt(raw, 10) || 0) : 140;
    const items = group.querySelectorAll("[data-reveal]");
    items.forEach((el, idx) => {
      if (!el.style.getPropertyValue("--reveal-delay")) {
        el.style.setProperty("--reveal-delay", `${idx * step}ms`);
      }
      el.setAttribute("data-stagger-index", String(idx));
    });
  });
}

function initScrollReveal() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  if (reduce.matches) {
    targets.forEach((el) => el.setAttribute("data-revealed", "1"));
    return;
  }

  // Hero items reveal on load (above-the-fold) — no IO gate.
  const heroItems = document.querySelectorAll("#hero [data-reveal]");
  requestAnimationFrame(() => {
    heroItems.forEach((el) => el.setAttribute("data-revealed", "1"));
  });

  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-revealed", "1");
        obs.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
  );

  targets.forEach((el) => {
    if (el.closest("#hero")) return;
    io.observe(el);
  });
}

// ── Lenis smooth scroll — desktop only, not under reduced-motion ──────

function initLenis() {
  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mqDesktop = window.matchMedia(`(min-width: ${MD}px)`);

  let lenis = null;

  function mount() {
    if (lenis || mqReduce.matches || !mqDesktop.matches) return;
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.09,
      smoothWheel: true,
      syncTouch: false,
      anchors: { duration: 1.25 },
    });
  }

  function unmount() {
    if (!lenis) return;
    lenis.destroy();
    lenis = null;
  }

  function sync() {
    if (!mqReduce.matches && mqDesktop.matches) mount();
    else unmount();
  }

  sync();
  mqReduce.addEventListener("change", sync);
  mqDesktop.addEventListener("change", sync);
}

// ── Bootstrap ──────────────────────────────────────────────────────────

applyStaggerDelays();
initScrollReveal();
initStoneRail();
initVerdict();
initLenis();
injectSpeedInsights();
injectAnalytics();
