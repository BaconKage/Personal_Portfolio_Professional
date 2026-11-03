"use client";
import { useEffect, useRef } from "react";
import { BANDS } from "@/lib/voice-analysis";
import { voice } from "@/lib/voice";
import { getCoreState } from "@/lib/core-sequence";

const bars = Array.from({ length: BANDS }, (_, i) => i);
const formatHz = (hz: number) =>
  hz >= 1000 ? `${(hz / 1000).toFixed(2)} kHz` : `${Math.round(hz)} Hz`;

/**
 * A live readout of what the core hears. Values are written straight to the
 * DOM from an animation frame; text updates are throttled so they stay
 * readable. Decorative for assistive technology: the prompt announces state.
 */
export default function VoiceHud({ active }: { active: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!active || !el) return;
    const bands = Array.from(
      el.querySelectorAll<HTMLElement>(".voice-bars span"),
    );
    const field = (key: string) =>
      el.querySelector<HTMLElement>(`[data-field="${key}"]`)!;
    const voiceText = field("voice"),
      pitch = field("pitch"),
      centroid = field("centroid"),
      flux = field("flux"),
      meter = field("meter"),
      prompt = field("prompt");
    let frame = 0,
      lastText = 0;
    const tick = (now: number) => {
      bands.forEach((bar, i) =>
        bar.style.setProperty("--v", (voice.bands[i] ?? 0).toFixed(3)),
      );
      meter.style.setProperty("--v", voice.charge.toFixed(3));
      el.dataset.voiced = voice.voiced ? "true" : "false";
      if (now - lastText > 90) {
        lastText = now;
        voiceText.textContent = voice.voiced
          ? "DETECTED"
          : voice.level > 0.08
            ? "SOUND"
            : "QUIET";
        pitch.textContent = voice.voiced ? formatHz(voice.pitch) : "—";
        centroid.textContent =
          voice.level > 0.05 && voice.centroid ? formatHz(voice.centroid) : "—";
        flux.textContent = voice.level > 0.05 ? voice.flux.toFixed(2) : "—";
        const phase = getCoreState().phase;
        prompt.textContent =
          phase === "idle"
            ? "HOLD A NOTE TO ENERGISE"
            : phase === "charging"
              ? "POWERING UP"
              : phase === "online"
                ? "ONLINE · YOUR VOICE DRIVES THE COILS"
                : "COOLING DOWN";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return (
    <div
      ref={root}
      className="voice-hud"
      data-active={active ? "true" : undefined}
      aria-hidden="true"
    >
      <p className="voice-hud-title">
        <i /> LISTENING · ON-DEVICE
      </p>
      <div className="voice-hud-body">
        <div className="voice-bars">
          {bars.map((i) => (
            <span key={i} />
          ))}
        </div>
        <dl>
          <div>
            <dt>VOICE</dt>
            <dd data-field="voice">QUIET</dd>
          </div>
          <div>
            <dt>PITCH</dt>
            <dd data-field="pitch">—</dd>
          </div>
          <div>
            <dt>CENTROID</dt>
            <dd data-field="centroid">—</dd>
          </div>
          <div>
            <dt>FLUX</dt>
            <dd data-field="flux">—</dd>
          </div>
        </dl>
      </div>
      <div className="voice-meter">
        <span data-field="prompt">HOLD A NOTE TO ENERGISE</span>
        <b data-field="meter">
          <i />
        </b>
      </div>
      <p className="voice-note">
        Analysed in your browser. Never recorded or sent.
      </p>
    </div>
  );
}
