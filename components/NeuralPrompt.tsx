"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  activateCore,
  getCoreState,
  getServerCoreState,
  resetCore,
  subscribeCore,
  type CorePhase,
} from "@/lib/core-sequence";
const labels: Record<CorePhase, string> = {
  idle: "Energise the core ↗",
  charging: "Charging the core…",
  dispersing: "Releasing the stars…",
  stars: "Reform the core ↻",
  reforming: "Reforming the core…",
};
const descriptions: Record<CorePhase, string> = {
  idle: "The core is ready to energise.",
  charging:
    "Blue pathways are gathering energy before the core expands into stars.",
  dispersing: "The core is becoming a star field.",
  stars:
    "The star field is ready. Choose Reform the core to bring the sculpture back.",
  reforming: "The stars are returning to reconstruct the core.",
};
export default function NeuralPrompt() {
  const { phase } = useSyncExternalStore(
    subscribeCore,
    getCoreState,
    getServerCoreState,
  );
  const container = useRef<HTMLDivElement>(null);
  const busy = !["idle", "stars"].includes(phase);
  useEffect(() => {
    const hero = container.current?.closest<HTMLElement>(".hero");
    if (!hero) return;
    const sync = () => {
      hero.dataset.corePhase = getCoreState().phase;
    };
    const unsubscribe = subscribeCore(sync);
    sync();
    const unavailable = () =>
      document.documentElement.dataset.motion === "reduced" ||
      !!document.documentElement.dataset.graphicsFallback;
    const fire = () => {
      if (
        unavailable() ||
        hero.dataset.ignition !== "complete" ||
        hero.querySelector<HTMLElement>(".hero-art")?.dataset.ready !== "true"
      )
        return;
      activateCore();
    };
    const preference = () => {
      if (unavailable()) resetCore();
    };
    const observer = new MutationObserver(preference);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion", "data-graphics-fallback"],
    });
    window.addEventListener("neural-signal", fire);
    return () => {
      observer.disconnect();
      window.removeEventListener("neural-signal", fire);
      unsubscribe();
      resetCore();
      delete hero.dataset.corePhase;
    };
  }, []);
  return (
    <div ref={container} className="neural-prompt" data-phase={phase}>
      <span>
        NEURAL STUDY <i /> MOVE TO FOCUS
      </span>
      <button
        aria-disabled={busy}
        onClick={() => window.dispatchEvent(new Event("neural-signal"))}
      >
        <span className="core-button-light" aria-hidden="true" />
        <span>{labels[phase]}</span>
      </button>
      <span className="sr-only" role="status">
        {descriptions[phase]}
      </span>
    </div>
  );
}
