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
  charging: "Powering up…",
  online: "Power down ↓",
  cooling: "Cooling down…",
};
const descriptions: Record<CorePhase, string> = {
  idle: "The reactor core is on standby, ready to energise.",
  charging: "The coils are lighting in sequence as the core powers up.",
  online:
    "The core is online and lighting the hero. Choose Power down to return it to standby.",
  cooling: "The core is powering down to standby.",
};
export default function NeuralPrompt() {
  const { phase } = useSyncExternalStore(
    subscribeCore,
    getCoreState,
    getServerCoreState,
  );
  const container = useRef<HTMLDivElement>(null);
  const busy = !["idle", "online"].includes(phase);
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
