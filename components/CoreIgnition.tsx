"use client";

import { useLayoutEffect, useRef } from "react";

const SESSION_KEY = "portfolio-core-ignition-v1";
const DURATION = 1450;
let seenInDocument = false;

/** The first rendered GPU frame starts the intro; failure always releases it. */
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
      seenInDocument = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "seen");
      } catch {}
    };
    const finish = () => {
      clearTimeout(timer);
      hero.dataset.ignition = "complete";
      delete hero.dataset.ignitionStart;
      remember();
      if (
        document.activeElement === container.querySelector(".ignition-skip")
      ) {
        hero.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
      }
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
      clearTimeout(timer);
      remember();
      hero.dataset.ignitionStart = String(performance.now());
      hero.dataset.ignition = "running";
      timer = setTimeout(finish, DURATION);
    };
    const begin = (manual = false) => {
      if (!allowed()) {
        finish();
        return;
      }
      clearTimeout(timer);
      if (manual) window.scrollTo({ top: 0, behavior: "instant" });
      startScroll = window.scrollY;
      hero.dataset.ignition = "waiting";
      // This is a maximum wait for graphics, never a minimum loading duration.
      timer = setTimeout(finish, 2500);
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
    actions.current = { skip: finish, replay: () => begin(true) };

    let seen = seenInDocument;
    try {
      seen ||= sessionStorage.getItem(SESSION_KEY) === "seen";
    } catch {}
    if (
      seen ||
      !allowed() ||
      window.scrollY > 100 ||
      (location.hash && location.hash !== "#main")
    ) {
      hero.dataset.ignition = "complete";
    } else begin();

    return () => {
      disposed = true;
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", followLink);
      window.removeEventListener("motion-change", preference);
      document.removeEventListener("visibilitychange", preference);
      media.removeEventListener("change", preference);
      delete hero.dataset.ignition;
      delete hero.dataset.ignitionStart;
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
