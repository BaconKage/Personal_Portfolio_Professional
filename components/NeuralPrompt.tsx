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
import {
  getServerVoiceStatus,
  getVoiceStatus,
  startVoice,
  stopVoice,
  subscribeVoice,
  voiceSupported,
  type VoiceStatus,
} from "@/lib/voice";
import VoiceHud from "./VoiceHud";
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
const voiceLabels: Record<VoiceStatus, string> = {
  off: "Talk to the core",
  starting: "Allow the mic…",
  on: "Listening · Stop",
  denied: "Talk to the core",
  missing: "Talk to the core",
  unsupported: "Talk to the core",
  error: "Talk to the core",
};
const voiceMessages: Partial<Record<VoiceStatus, string>> = {
  on: "Listening. The coils follow your voice; hold a note to energise the core. Audio is analysed on this device and never recorded or sent.",
  denied:
    "Microphone access was blocked. Allow it from the address bar to talk to the core.",
  missing: "No microphone was found. Connect one to talk to the core.",
  error: "The microphone could not be started.",
};
const noop = () => () => {};

export default function NeuralPrompt() {
  const { phase } = useSyncExternalStore(
    subscribeCore,
    getCoreState,
    getServerCoreState,
  );
  const voiceStatus = useSyncExternalStore(
    subscribeVoice,
    getVoiceStatus,
    getServerVoiceStatus,
  );
  const canListen = useSyncExternalStore(noop, voiceSupported, () => true);
  const container = useRef<HTMLDivElement>(null);
  const busy = !["idle", "online"].includes(phase);
  const listening = voiceStatus === "on";
  useEffect(() => {
    const hero = container.current?.closest<HTMLElement>(".hero");
    if (!hero) return;
    const sync = () => {
      hero.dataset.corePhase = getCoreState().phase;
      hero.dataset.voice = getVoiceStatus();
    };
    const unsubscribe = subscribeCore(sync);
    const unsubscribeVoice = subscribeVoice(sync);
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
      if (!unavailable()) return;
      resetCore();
      stopVoice();
    };
    const observer = new MutationObserver(preference);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion", "data-graphics-fallback"],
    });
    // The mic only stays open while someone can see what it drives.
    let seen = false;
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) seen = true;
      else if (seen) {
        seen = false;
        stopVoice();
      }
    });
    visibility.observe(hero);
    const hidden = () => {
      if (document.hidden) stopVoice();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("neural-signal", fire);
    return () => {
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("neural-signal", fire);
      unsubscribe();
      unsubscribeVoice();
      stopVoice();
      resetCore();
      delete hero.dataset.corePhase;
      delete hero.dataset.voice;
    };
  }, []);
  return (
    <>
      <div ref={container} className="neural-prompt" data-phase={phase}>
        <span>
          NEURAL STUDY <i /> MOVE TO FOCUS
        </span>
        {canListen && (
          <button
            className="voice-toggle"
            aria-pressed={listening}
            aria-label={
              listening
                ? "Stop listening"
                : "Talk to the core using your microphone"
            }
            aria-disabled={voiceStatus === "starting"}
            onClick={() => (listening ? stopVoice() : startVoice())}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
            <span className="voice-toggle-label">
              {voiceLabels[voiceStatus]}
            </span>
          </button>
        )}
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
        <span
          className="voice-message"
          role="status"
          data-visible={
            ["denied", "missing", "error"].includes(voiceStatus)
              ? "true"
              : undefined
          }
        >
          {voiceMessages[voiceStatus] ?? ""}
        </span>
      </div>
      {canListen && <VoiceHud active={listening} />}
    </>
  );
}
