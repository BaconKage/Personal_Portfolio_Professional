"use client";

import { useLayoutEffect, useRef } from "react";
import { CORE_IGNITION_MS } from "@/lib/motion";
import { resetCore } from "@/lib/core-sequence";
import { lockScroll, unlockScroll } from "@/lib/scroll";

let seenInDocument = false;

/**
 * First visits open on a preloader whose counter tracks real readiness (fonts,
 * renderer, compiled hero). It hands over to the ignition as it lifts. The
 * first rendered GPU frame starts the intro; failure always releases it.
 */
export default function CoreIgnition() {
  const controls = useRef<HTMLDivElement>(null);
  const actions = useRef({ skip: () => {}, replay: () => {} });

  useLayoutEffect(() => {
    const container = controls.current;
    const hero = container?.closest<HTMLElement>(".hero");
    const artwork = hero?.querySelector<HTMLElement>(".hero-art");
    if (!container || !hero || !artwork) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let startScroll = window.scrollY;
    let disposed = false;
    let preloading = false;
    let frame = 0;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    const navigation = performance.getEntriesByType("navigation")[0] as
      PerformanceNavigationTiming | undefined;
    const reloading = navigation?.type === "reload";
    const previousRestoration = history.scrollRestoration;
    hero.style.setProperty("--ignition-duration", `${CORE_IGNITION_MS}ms`);

    const allowed = () => {
      let preference = "system";
      try {
        preference = localStorage.getItem("portfolio-motion") || "system";
      } catch {}
      return (
        !media.matches &&
        preference !== "reduced" &&
        !document.hidden &&
        !document.documentElement.dataset.graphicsFallback
      );
    };
    const remember = () => {
      // Returning through client-side navigation skips entry; a refresh resets it.
      seenInDocument = true;
    };
    const root = document.documentElement;
    const loader = document.querySelector<HTMLElement>(".preloader");
    const count = loader?.querySelector<HTMLElement>(".preloader-count");
    const skip = loader?.querySelector<HTMLButtonElement>(".preloader-skip");
    // The curtain lifts; the ignition plays underneath it.
    const release = () => {
      cancelAnimationFrame(frame);
      unlockScroll("preloader");
      if (!preloading) return;
      preloading = false;
      root.dataset.preloader = "exit";
      clearTimeout(exitTimer);
      exitTimer = setTimeout(() => {
        root.dataset.preloader = "off";
      }, 950);
    };
    const finish = () => {
      clearTimeout(timer);
      release();
      hero.dataset.ignition = "complete";
      delete hero.dataset.ignitionStart;
      if (reloading) history.scrollRestoration = previousRestoration;
      remember();
      if (
        document.activeElement === container.querySelector(".ignition-skip")
      ) {
        hero.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
      }
    };
    const run = () => {
      clearTimeout(timer);
      remember();
      hero.dataset.ignitionStart = String(performance.now());
      hero.dataset.ignition = "running";
      timer = setTimeout(finish, CORE_IGNITION_MS);
    };
    const ignite = () => {
      if (
        disposed ||
        hero.dataset.ignition !== "waiting" ||
        artwork.dataset.ready !== "true"
      )
        return;
      if (!allowed()) {
        finish();
        return;
      }
      // The preloader's counter hands over once it reaches 100.
      if (!preloading) run();
    };
    const preload = () => {
      preloading = true;
      root.dataset.preloader = "loading";
      lockScroll("preloader");
      let shown = 0,
        fonts = false;
      document.fonts?.ready.then(() => (fonts = true));
      let last = performance.now();
      const tick = (now: number) => {
        if (disposed || !preloading) return;
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
        last = now;
        const ready = artwork.dataset.ready === "true";
        const target = ready
          ? 1
          : 0.14 +
            (fonts ? 0.26 : 0) +
            (document.querySelector(".global-canvas canvas") ? 0.34 : 0);
        // Eased toward real progress, but never faster than the blueprint
        // can visibly draw itself (about 1.3s from empty to complete).
        shown += Math.min((target - shown) * (ready ? 0.16 : 0.06), dt * 0.75);
        if (ready && shown > 0.994) shown = 1;
        if (count)
          count.textContent = String(Math.round(shown * 100)).padStart(3, "0");
        loader?.style.setProperty("--p", shown.toFixed(4));
        if (shown < 1) {
          frame = requestAnimationFrame(tick);
          return;
        }
        release();
        if (hero.dataset.ignition === "waiting") run();
      };
      frame = requestAnimationFrame(tick);
    };
    const begin = (manual = false, first = false) => {
      if (manual) resetCore();
      if (!allowed()) {
        finish();
        return;
      }
      clearTimeout(timer);
      if (manual) window.scrollTo({ top: 0, behavior: "instant" });
      startScroll = window.scrollY;
      hero.dataset.ignition = "waiting";
      if (first) preload();
      // This is a maximum wait for graphics, never a minimum loading duration.
      timer = setTimeout(finish, first ? 5000 : 2500);
      ignite();
      if (
        manual &&
        document.activeElement === container.querySelector(".ignition-replay")
      ) {
        container
          .querySelector<HTMLButtonElement>(".ignition-skip")
          ?.focus({ preventScroll: true });
      }
    };
    const active = () =>
      ["waiting", "running"].includes(hero.dataset.ignition || "");
    const scroll = () => {
      if (active() && Math.abs(window.scrollY - startScroll) > 32) finish();
    };
    const key = (event: KeyboardEvent) => {
      if (active() && event.key === "Escape") finish();
    };
    const preference = (event?: Event) => {
      if (
        active() &&
        (!allowed() ||
          (event instanceof CustomEvent && event.detail === "reduced"))
      )
        finish();
    };
    const followLink = (event: PointerEvent) => {
      if (
        active() &&
        event.target instanceof Element &&
        event.target.closest("a")
      )
        finish();
    };
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.graphicsFallback && active())
        finish();
      else ignite();
    });
    observer.observe(artwork, {
      attributes: true,
      attributeFilter: ["data-ready"],
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-graphics-fallback", "data-motion"],
    });
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", followLink);
    window.addEventListener("motion-change", preference);
    document.addEventListener("visibilitychange", preference);
    media.addEventListener("change", preference);
    skip?.addEventListener("click", finish);
    actions.current = { skip: finish, replay: () => begin(true) };

    if (
      seenInDocument ||
      !allowed() ||
      (!reloading &&
        (window.scrollY > 100 || (location.hash && location.hash !== "#main")))
    ) {
      hero.dataset.ignition = "complete";
      root.dataset.preloader = "off";
    } else {
      if (reloading) history.scrollRestoration = "manual";
      begin(reloading, true);
    }

    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(exitTimer);
      cancelAnimationFrame(frame);
      unlockScroll("preloader");
      delete root.dataset.preloader;
      skip?.removeEventListener("click", finish);
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", followLink);
      window.removeEventListener("motion-change", preference);
      document.removeEventListener("visibilitychange", preference);
      media.removeEventListener("change", preference);
      delete hero.dataset.ignition;
      delete hero.dataset.ignitionStart;
      hero.style.removeProperty("--ignition-duration");
      if (reloading) history.scrollRestoration = previousRestoration;
      actions.current = { skip: () => {}, replay: () => {} };
    };
  }, []);

  return (
    <div ref={controls} className="core-ignition">
      <span className="ignition-message" aria-hidden="true">
        <i /> CORE / IGNITION
      </span>
      <button className="ignition-skip" onClick={() => actions.current.skip()}>
        Skip intro ↗
      </button>
      <button
        className="ignition-replay"
        onClick={() => actions.current.replay()}
      >
        Replay intro ↻
      </button>
      <span className="ignition-scroll">SCROLL TO EXPLORE ↓</span>
    </div>
  );
}
